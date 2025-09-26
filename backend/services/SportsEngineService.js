const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const jwt = require('jsonwebtoken');
const fs = require('fs');

class SportsEngineService {
  constructor() {
    this.loginUrl = 'https://user.sportngin.com/users/sign_in';
    this.dashboardUrl = 'https://my.sportngin.com/user';
    this.sessions = new Map(); // Store active sessions
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  }

  /**
   * Find Chrome executable path
   */
  findChrome() {
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      '/usr/bin/google-chrome-stable', // Linux
      '/usr/bin/google-chrome', // Linux
      '/usr/bin/chromium-browser', // Linux
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows
    ];

    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }

    throw new Error('Chrome browser not found. Please install Google Chrome.');
  }

  /**
   * Authenticate user with SportsEngine credentials
   */
  async authenticate(email, password) {
    let browser;
    try {
      console.log('Starting SportsEngine authentication...');
      
      // Launch browser
      browser = await puppeteer.launch({
        executablePath: this.findChrome(),
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to login page
      console.log('Navigating to login page...');
      await page.goto(this.loginUrl, { waitUntil: 'networkidle2' });
      
      // Debug: Take screenshot and log page content
      console.log('Current URL:', page.url());
      await page.screenshot({ path: '/tmp/sportsengine-debug.png', fullPage: true });
      
      // Log all input elements on the page
      const inputs = await page.evaluate(() => {
        const allInputs = Array.from(document.querySelectorAll('input'));
        return allInputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          className: input.className
        }));
      });
      console.log('Found inputs:', JSON.stringify(inputs, null, 2));
      
      // SportsEngine uses a login field that accepts email or username
      console.log('Looking for login input...');
      let loginInput = null;
      const loginSelectors = [
        'input[name="user[login]"]',
        '#user_login',
        'input[type="text"]',
        'input[name="login"]'
      ];
      
      for (const selector of loginSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          loginInput = selector;
          console.log(`Found login input with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Selector ${selector} not found`);
        }
      }
      
      if (!loginInput) {
        throw new Error('Could not find login input field on the page');
      }
      
      // Fill in email/username using the found selector
      console.log('Filling in login (email)...');
      await page.type(loginInput, email);
      
      // Click continue button to go to password step
      console.log('Looking for continue button...');
      const continueSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        '.pl-button--highlight',
        'input[name="commit"]'
      ];
      
      let continueButton = null;
      for (const selector of continueSelectors) {
        try {
          continueButton = await page.$(selector);
          if (continueButton) {
            console.log(`Found continue button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Continue button selector ${selector} not found`);
        }
      }
      
      if (continueButton) {
        console.log('Clicking continue button...');
        await continueButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('Navigated to password page, URL:', page.url());
      } else {
        console.log('No continue button found, proceeding...');
      }
      
      // Debug: Log inputs on password page
      const passwordPageInputs = await page.evaluate(() => {
        const allInputs = Array.from(document.querySelectorAll('input'));
        return allInputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          className: input.className
        }));
      });
      console.log('Password page inputs:', JSON.stringify(passwordPageInputs, null, 2));
      
      // Find password input
      console.log('Looking for password input...');
      let passwordInput = null;
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="user[password]"]',
        'input[name="password"]',
        '#user_password',
        '#password'
      ];
      
      for (const selector of passwordSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          passwordInput = selector;
          console.log(`Found password input with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Password selector ${selector} not found`);
        }
      }
      
      if (!passwordInput) {
        throw new Error('Could not find password input field on the page');
      }
      
      // Fill in password
      console.log('Filling in password...');
      await page.type(passwordInput, password);
      
      // Submit login form
      console.log('Looking for login submit button...');
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        '.pl-button--highlight',
        'input[name="commit"]',
        'button[name="commit"]'
      ];
      
      let loginButton = null;
      for (const selector of submitSelectors) {
        try {
          loginButton = await page.$(selector);
          if (loginButton) {
            console.log(`Found login button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Login button selector ${selector} not found`);
        }
      }
      
      if (loginButton) {
        console.log('Clicking login button...');
        await loginButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      } else {
        console.log('No login button found');
      }
      
      // Check if login was successful
      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);
      
      if (currentUrl.includes('sign_in') || currentUrl.includes('login')) {
        // Check for error messages
        const errorElement = await page.$('.alert-danger, .error, .alert-error');
        let errorMessage = 'Invalid credentials';
        
        if (errorElement) {
          errorMessage = await page.evaluate(el => el.textContent.trim(), errorElement);
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle MFA onboarding redirect
      if (currentUrl.includes('mfa-onboarding') || currentUrl.includes('setup')) {
        console.log('Detected MFA onboarding page, trying to skip...');
        
        // Look for skip or continue buttons
        const skipSelectors = [
          'a[href*="skip"]',
          'button:contains("Skip")',
          'a:contains("Skip")',
          'a:contains("Continue")',
          '.skip-link',
          '.continue-link'
        ];
        
        let skipped = false;
        for (const selector of skipSelectors) {
          try {
            const skipButton = await page.$(selector);
            if (skipButton) {
              console.log(`Found skip button with selector: ${selector}`);
              await skipButton.click();
              await page.waitForNavigation({ waitUntil: 'networkidle2' });
              skipped = true;
              break;
            }
          } catch (e) {
            console.log(`Skip selector ${selector} not found`);
          }
        }
        
        if (!skipped) {
          console.log('Could not find skip button, navigating directly to dashboard...');
        }
      }
      
      // Get cookies for session management
      const cookies = await page.cookies();
      
      // Navigate to user dashboard to verify access
      console.log('Navigating to user dashboard...');
      await page.goto(this.dashboardUrl, { waitUntil: 'networkidle2' });
      console.log('User dashboard URL:', page.url());
      
      // Create session token
      const sessionToken = jwt.sign(
        { 
          email, 
          timestamp: Date.now(),
          sessionId: Math.random().toString(36).substring(7)
        }, 
        this.jwtSecret,
        { expiresIn: '24h' }
      );
      
      // Store session data
      this.sessions.set(sessionToken, {
        cookies,
        email,
        createdAt: Date.now(),
        lastUsed: Date.now()
      });
      
      console.log('Authentication successful');
      
      return {
        success: true,
        sessionData: {
          token: sessionToken,
          cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain }))
        }
      };
      
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        message: error.message || 'Authentication failed'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Validate credentials without creating a full session
   */
  async validateCredentials(email, password) {
    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: this.findChrome(),
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(this.loginUrl, { waitUntil: 'networkidle2' });
      
      // Fill credentials
      await page.waitForSelector('input[type="email"], input[name="user[email]"]');
      await page.type('input[type="email"], input[name="user[email]"]', email);
      
      const continueButton = await page.$('button[type="submit"], input[type="submit"]');
      if (continueButton) {
        await continueButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      await page.waitForSelector('input[type="password"], input[name="user[password]"]');
      await page.type('input[type="password"], input[name="user[password]"]', password);
      
      const loginButton = await page.$('button[type="submit"], input[type="submit"]');
      if (loginButton) {
        await loginButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      const currentUrl = page.url();
      const isValid = !currentUrl.includes('sign_in') && !currentUrl.includes('login');
      
      return {
        success: isValid,
        message: isValid ? 'Credentials are valid' : 'Invalid credentials'
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Validation failed'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Test connection with existing session
   */
  async testConnection(token) {
    try {
      const sessionData = this.getSession(token);
      if (!sessionData) {
        return { success: false, message: 'Invalid or expired session' };
      }

      // Update last used timestamp
      sessionData.lastUsed = Date.now();
      
      return { success: true, message: 'Connection is active' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get organizations for authenticated user
   */
  async getOrganizations(token) {
    const sessionData = this.getSession(token);
    if (!sessionData) {
      throw new Error('Invalid or expired session');
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: this.findChrome(),
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set cookies from session
      await page.setCookie(...sessionData.cookies);
      
      // Navigate to user dashboard first
      console.log('Navigating to user dashboard...');
      await page.goto('https://my.sportngin.com/user', { waitUntil: 'networkidle2' });
      console.log(`Loaded user dashboard: ${page.url()}`);
      
      // Click "Teams" in the navigation sidebar
      console.log('Looking for Teams navigation link...');
      const teamsNavSelectors = [
        'a[href="/user/my-teams"]',
        'a[href*="/user/my-teams"]',
        '.se-fe-left-nav__menu-item a[href*="my-teams"]',
        '.se-fe-left-nav__menu-item a',
        'a[href*="my-teams"]'
      ];
      
      let teamsNavLink = null;
      for (const selector of teamsNavSelectors) {
        try {
          teamsNavLink = await page.$(selector);
          if (teamsNavLink) {
            console.log(`Found Teams nav link with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Teams nav selector ${selector} failed:`, e.message);
        }
      }
      
      // If standard selectors fail, look for the specific span text structure
      if (!teamsNavLink) {
        console.log('Standard selectors failed, looking for Teams span text...');
        teamsNavLink = await page.evaluateHandle(() => {
          // Look for span with "Teams" text and get its parent link
          const spans = Array.from(document.querySelectorAll('span.se-fe-left-nav__link-text'));
          const teamsSpan = spans.find(span => 
            span.textContent && span.textContent.trim() === 'Teams'
          );
          
          if (teamsSpan) {
            // Find the parent <a> tag
            let parent = teamsSpan.parentElement;
            while (parent && parent.tagName !== 'A') {
              parent = parent.parentElement;
            }
            return parent;
          }
          return null;
        });
        
        if (await teamsNavLink.evaluate(el => el !== null)) {
          console.log('Found Teams nav link via span text search');
        }
      }
      
      if (teamsNavLink) {
        try {
          console.log('Clicking Teams navigation link...');
          
          // Try to scroll the element into view first
          await teamsNavLink.evaluate(el => el.scrollIntoView());
          await page.waitForTimeout(1000); // Wait for scroll
          
          // Try clicking with different methods
          try {
            await teamsNavLink.click();
          } catch (clickError) {
            console.log('Regular click failed, trying JavaScript click...');
            await teamsNavLink.evaluate(el => el.click());
          }
          
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
          console.log('Navigated to Teams page:', page.url());
        } catch (navError) {
          console.log('Navigation click failed:', navError.message);
          console.log('Falling back to direct navigation...');
          await page.goto('https://my.sportngin.com/user/my-teams', { waitUntil: 'networkidle2' });
          console.log('Direct navigation to Teams page:', page.url());
        }
      } else {
        console.log('Teams nav link not found, trying direct navigation...');
        await page.goto('https://my.sportngin.com/user/my-teams', { waitUntil: 'networkidle2' });
        console.log('Direct navigation to Teams page:', page.url());
      }
      
      // Debug: Take screenshot of dashboard
      await page.screenshot({ path: '/tmp/sportsengine-dashboard.png', fullPage: true });
      
      // Extract teams from the "My Teams" section specifically
      const organizations = await page.evaluate(() => {
        const orgs = [];
        
        // We should now be on the My Teams page - look for team cards/links
        console.log('Current page URL:', window.location.href);
        console.log('Page title:', document.title);
        
        // Look for team cards or links on the My Teams page
        const teamElements = document.querySelectorAll('a[href*="team"], .team-card, .team-link, .team-item');
        console.log('Found potential team elements:', teamElements.length);
        
        teamElements.forEach((element, index) => {
          const teamName = element.textContent?.trim() || 
                          element.querySelector('.team-name, h3, h4, h5')?.textContent?.trim();
          const href = element.href;
          
          console.log(`Team element ${index}:`, teamName, href);
          
          if (teamName && href && teamName.length > 3 && 
              !teamName.includes('See all') && 
              !teamName.includes('Adam Hairfield') && // Skip user name
              (href.includes('team') || href.includes('Team'))) {
            
            const teamId = href.match(/team[/-](\d+)/)?.[1] || 
                          href.match(/TeamService[^-]*-([^-]+)/)?.[1] || 
                          `team_${index}`;
            
            console.log('Adding team:', teamName, teamId, href);
            
            orgs.push({
              id: teamId,
              name: teamName,
              description: `Team: ${teamName}`,
              type: 'team',
              url: href
            });
          }
        });
        
        // Also look for any text that contains "James River Football" specifically
        if (orgs.length === 0) {
          console.log('No teams found with standard selectors, looking for specific text...');
          const allLinks = document.querySelectorAll('a');
          
          allLinks.forEach((link, index) => {
            const linkText = link.textContent?.trim();
            const href = link.href;
            
            if (linkText && href && 
                (linkText.includes('James River') || linkText.includes('Football')) &&
                href.includes('team')) {
              
              console.log('Found James River team link:', linkText, href);
              
              orgs.push({
                id: `james_river_${index}`,
                name: linkText,
                description: `Team: ${linkText}`,
                type: 'team',
                url: href
              });
            }
          });
        }
        
        // Fallback: Look for team links in the entire page if My Teams section not found
        if (orgs.length === 0) {
          console.log('Fallback: Looking for team links on entire page');
          
          // Look for links that contain team names and have team-related URLs
          const allLinks = document.querySelectorAll('a[href]');
          
          allLinks.forEach((link, index) => {
            const href = link.href;
            const linkText = link.textContent?.trim();
            
            // Check if this looks like a team link
            if (href && linkText && 
                (href.includes('TeamService') || href.includes('/team/') || href.includes('team-')) &&
                linkText.length > 3 && 
                !linkText.includes('See all') &&
                !linkText.includes('Showing') &&
                !linkText.toLowerCase().includes('download')) {
              
              const teamId = href.match(/TeamService[^-]*-([^-]+)/)?.[1] || 
                           href.match(/team[/-](\d+)/)?.[1] || 
                           `team_${index}`;
              
              console.log('Found team link:', linkText, href);
              
              orgs.push({
                id: teamId,
                name: linkText,
                description: `Team: ${linkText}`,
                type: 'team',
                url: href
              });
            }
          });
        }
        
        console.log('Final organizations found:', orgs.length);
        orgs.forEach(org => console.log('Org:', org.name, org.id));
        
        return orgs;
      });

      // Update session usage
      sessionData.lastUsed = Date.now();
      
      return organizations;
      
    } catch (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get teams for a specific organization (enhanced to get real team data)
   */
  async getTeamsForOrganization(token, organizationId) {
    const sessionData = this.getSession(token);
    if (!sessionData) {
      throw new Error('Invalid or expired session');
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: this.findChrome(),
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setCookie(...sessionData.cookies);
      
      // First, get the organizations to find the team URL
      const organizations = await this.getOrganizations(token);
      const targetOrg = organizations.find(org => org.id === organizationId);
      
      if (!targetOrg || !targetOrg.url) {
        throw new Error('Organization not found or no URL available');
      }
      
      console.log('Navigating to team URL:', targetOrg.url);
      await page.goto(targetOrg.url, { waitUntil: 'networkidle2' });
      console.log('Current URL after team navigation:', page.url());
      
      // Take screenshot of team page for debugging
      await page.screenshot({ path: '/tmp/sportsengine-team-page.png', fullPage: true });
      
      // Look for "Roster" link in the left sidebar navigation
      console.log('Looking for Roster link in sidebar...');
      const rosterSelectors = [
        'a[href*="roster"]',
        'a[href*="Roster"]', 
        '.sidebar a:contains("Roster")',
        '.nav a:contains("Roster")',
        '.navigation a:contains("Roster")',
        'nav a[href*="roster"]'
      ];
      
      let rosterLink = null;
      for (const selector of rosterSelectors) {
        try {
          if (selector.includes(':contains')) {
            // Handle :contains selector manually
            rosterLink = await page.evaluateHandle(() => {
              const links = Array.from(document.querySelectorAll('a'));
              return links.find(link => 
                link.textContent && 
                link.textContent.toLowerCase().includes('roster')
              );
            });
            if (await rosterLink.evaluate(el => el !== null)) {
              console.log(`Found roster link with text content search`);
              break;
            }
          } else {
            rosterLink = await page.$(selector);
            if (rosterLink) {
              console.log(`Found roster link with selector: ${selector}`);
              break;
            }
          }
        } catch (e) {
          console.log(`Roster selector ${selector} failed:`, e.message);
        }
      }
      
      if (rosterLink) {
        console.log('Clicking roster link...');
        await rosterLink.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('Navigated to roster page:', page.url());
        
        // Take screenshot of roster page
        await page.screenshot({ path: '/tmp/sportsengine-roster-page.png', fullPage: true });
      } else {
        console.log('No roster link found, staying on current page');
      }
      
      // Extract team information and player count
      const teamData = await page.evaluate(() => {
        // Get team name from sidebar (based on your screenshot structure)
        const teamName = document.querySelector('.sidebar h2, .team-title, h1')?.textContent?.trim() ||
                         document.querySelector('.team-name')?.textContent?.trim() ||
                         document.title?.split(' - ')[0] || 'Unknown Team';
        
        console.log('Extracting team name:', teamName);
        
        // Look for roster table - based on your screenshot structure
        const players = [];
        
        // Try different table selectors
        const tables = document.querySelectorAll('table');
        console.log('Found tables:', tables.length);
        
        tables.forEach((table, tableIndex) => {
          console.log(`Checking table ${tableIndex}`);
          const rows = table.querySelectorAll('tbody tr, tr');
          
          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            console.log(`Row ${rowIndex} has ${cells.length} cells`);
            
            if (cells.length >= 3) {
              // Skip header rows
              const firstCellText = cells[0]?.textContent?.trim();
              if (firstCellText && 
                  !firstCellText.includes('NAME') && 
                  !firstCellText.includes('PLAYER') &&
                  firstCellText.length > 1) {
                
                const name = cells[0]?.textContent?.trim();
                const number = cells[1]?.textContent?.trim();
                const position = cells[2]?.textContent?.trim();
                
                console.log('Found player:', name, number, position);
                
                players.push({
                  name: name,
                  jerseyNumber: number || '',
                  position: position || '',
                  id: `player_${players.length}`
                });
              }
            }
          });
        });
        
        // Also check for Players/Staff tabs
        const playersTab = document.querySelector('a:contains("Players"), .tab:contains("Players")') ||
                          Array.from(document.querySelectorAll('a, button, .tab')).find(el => 
                            el.textContent && el.textContent.includes('Players')
                          );
        const staffTab = document.querySelector('a:contains("Staff"), .tab:contains("Staff")') ||
                        Array.from(document.querySelectorAll('a, button, .tab')).find(el => 
                          el.textContent && el.textContent.includes('Staff')
                        );
        
        console.log('Players tab found:', !!playersTab);
        console.log('Staff tab found:', !!staffTab);
        console.log('Total players extracted:', players.length);
        
        return {
          teamName,
          playerCount: players.length,
          players,
          hasStaff: !!staffTab,
          hasPlayersTab: !!playersTab,
          url: window.location.href
        };
      });
      
      console.log('Extracted team data:', teamData);
      
      // Create team object with real data
      const teams = [{
        id: organizationId,
        name: teamData.teamName,
        sport: 'Football', // Could be extracted from team name or page
        gender: 'Unknown',
        organizationId: organizationId,
        playerCount: teamData.playerCount,
        players: teamData.players,
        hasStaff: teamData.hasStaff,
        url: teamData.url
      }];

      return teams;
      
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get roster for a specific team
   */
  async getTeamRoster(token, teamId) {
    const sessionData = this.getSession(token);
    if (!sessionData) {
      throw new Error('Invalid or expired session');
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: this.findChrome(),
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setCookie(...sessionData.cookies);
      
      // Navigate to specific team roster
      const rosterUrl = `${this.dashboardUrl}/competition/rostering/teams/${teamId}`;
      await page.goto(rosterUrl, { waitUntil: 'networkidle2' });
      
      // Extract roster data
      const roster = await page.evaluate(() => {
        const players = [];
        const staff = [];
        
        // Extract players
        const playerElements = document.querySelectorAll('.player-row, .roster-player, [data-player-id]');
        playerElements.forEach((element, index) => {
          const nameElement = element.querySelector('.player-name, .name') || element;
          const name = nameElement.textContent?.trim();
          
          if (name) {
            const [firstName, ...lastNameParts] = name.split(' ');
            const lastName = lastNameParts.join(' ') || '';
            
            const jerseyElement = element.querySelector('.jersey, .number, [data-jersey]');
            const jerseyNumber = jerseyElement?.textContent?.trim() || '';
            
            players.push({
              profileId: `player_${index}`,
              firstName: firstName || '',
              lastName: lastName,
              jerseyNumber: jerseyNumber,
              rosterStatus: 'active'
            });
          }
        });
        
        // Extract staff
        const staffElements = document.querySelectorAll('.staff-row, .roster-staff, [data-staff-id]');
        staffElements.forEach((element, index) => {
          const nameElement = element.querySelector('.staff-name, .name') || element;
          const name = nameElement.textContent?.trim();
          
          if (name) {
            const [firstName, ...lastNameParts] = name.split(' ');
            const lastName = lastNameParts.join(' ') || '';
            
            const titleElement = element.querySelector('.title, .role, .position');
            const title = titleElement?.textContent?.trim() || 'Staff';
            
            staff.push({
              profileId: `staff_${index}`,
              firstName: firstName || '',
              lastName: lastName,
              title: title,
              rosterStatus: 'active'
            });
          }
        });
        
        return { players, staff };
      });

      sessionData.lastUsed = Date.now();
      return roster;
      
    } catch (error) {
      console.error('Error fetching team roster:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get migration preview (summary of all data)
   */
  async getMigrationPreview(token) {
    try {
      const organizations = await this.getOrganizations(token);
      const preview = {
        organizations: [],
        totalTeams: 0,
        totalPlayers: 0,
        totalStaff: 0
      };

      for (const org of organizations) {
        try {
          const teams = await this.getTeamsForOrganization(token, org.id);
          
          let orgPlayers = 0;
          let orgStaff = 0;
          
          const orgPreview = {
            id: org.id,
            name: org.name,
            description: org.description,
            teams: []
          };

          for (const team of teams) {
            try {
              const roster = await this.getTeamRoster(token, team.id);
              const playerCount = roster.players?.length || 0;
              const staffCount = roster.staff?.length || 0;
              
              orgPlayers += playerCount;
              orgStaff += staffCount;
              
              orgPreview.teams.push({
                id: team.id,
                name: team.name,
                sport: team.sport,
                gender: team.gender,
                playerCount,
                staffCount
              });
            } catch (teamError) {
              console.error(`Error fetching roster for team ${team.id}:`, teamError);
              // Add team without roster data
              orgPreview.teams.push({
                id: team.id,
                name: team.name,
                sport: team.sport,
                gender: team.gender,
                playerCount: 0,
                staffCount: 0
              });
            }
          }

          preview.organizations.push(orgPreview);
          preview.totalTeams += teams.length;
          preview.totalPlayers += orgPlayers;
          preview.totalStaff += orgStaff;
          
        } catch (orgError) {
          console.error(`Error fetching teams for organization ${org.id}:`, orgError);
        }
      }

      return preview;
    } catch (error) {
      console.error('Error generating migration preview:', error);
      throw error;
    }
  }

  /**
   * Get session data by token
   */
  getSession(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const sessionData = this.sessions.get(token);
      
      if (!sessionData) {
        return null;
      }
      
      // Check if session is expired (24 hours)
      if (Date.now() - sessionData.createdAt > 86400000) {
        this.sessions.delete(token);
        return null;
      }
      
      return sessionData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupSessions() {
    const now = Date.now();
    for (const [token, sessionData] of this.sessions.entries()) {
      if (now - sessionData.createdAt > 86400000) {
        this.sessions.delete(token);
      }
    }
  }
}

module.exports = new SportsEngineService();
