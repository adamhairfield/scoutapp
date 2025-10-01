import { supabase } from '../config/supabase';

export const registrationService = {
  /**
   * Create a new registration
   */
  async createRegistration(registrationData) {
    try {
      console.log('Creating registration:', registrationData);

      const { data, error } = await supabase
        .from('registrations')
        .insert([registrationData])
        .select()
        .single();

      if (error) {
        console.error('Error creating registration:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception creating registration:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all registrations for a group
   */
  async getGroupRegistrations(groupId) {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching registrations:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Exception fetching registrations:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get a single registration by ID
   */
  async getRegistration(registrationId) {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (error) {
        console.error('Error fetching registration:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception fetching registration:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update a registration
   */
  async updateRegistration(registrationId, updates) {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .update(updates)
        .eq('id', registrationId)
        .select()
        .single();

      if (error) {
        console.error('Error updating registration:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception updating registration:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a registration
   */
  async deleteRegistration(registrationId) {
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registrationId);

      if (error) {
        console.error('Error deleting registration:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception deleting registration:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add participant fields to a registration
   */
  async addParticipantFields(registrationId, fields) {
    try {
      const fieldsToInsert = fields.map((field, index) => ({
        registration_id: registrationId,
        field_key: field.key,
        field_label: field.label,
        field_type: field.type || 'text',
        is_required: field.required || false,
        options: field.options || null,
        order_index: index,
      }));

      const { data, error } = await supabase
        .from('registration_participant_fields')
        .insert(fieldsToInsert)
        .select();

      if (error) {
        console.error('Error adding participant fields:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception adding participant fields:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add custom forms to a registration
   */
  async addCustomForms(registrationId, forms) {
    try {
      const formsToInsert = forms.map((form, index) => ({
        registration_id: registrationId,
        name: form.name,
        description: form.description || null,
        is_required: form.required || false,
        order_index: index,
      }));

      const { data, error } = await supabase
        .from('registration_forms')
        .insert(formsToInsert)
        .select();

      if (error) {
        console.error('Error adding custom forms:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception adding custom forms:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add waivers to a registration
   */
  async addWaivers(registrationId, waivers) {
    try {
      const waiversToInsert = waivers.map((waiver, index) => ({
        registration_id: registrationId,
        name: waiver.name,
        content: waiver.content,
        waiver_type: waiver.type || 'custom',
        is_required: waiver.required !== false,
        order_index: index,
      }));

      const { data, error } = await supabase
        .from('registration_waivers')
        .insert(waiversToInsert)
        .select();

      if (error) {
        console.error('Error adding waivers:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception adding waivers:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add optional items to a registration
   */
  async addOptionalItems(registrationId, items) {
    try {
      const itemsToInsert = items.map((item, index) => ({
        registration_id: registrationId,
        name: item.name,
        description: item.description || null,
        price: item.price,
        max_quantity: item.maxQuantity || null,
        is_available: true,
        order_index: index,
      }));

      const { data, error } = await supabase
        .from('registration_optional_items')
        .insert(itemsToInsert)
        .select();

      if (error) {
        console.error('Error adding optional items:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception adding optional items:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add custom fields to a registration
   */
  async addCustomFields(registrationId, fields) {
    try {
      const fieldsToInsert = fields.map((field, index) => ({
        registration_id: registrationId,
        field_type: field.type,
        label: field.label,
        placeholder: field.placeholder || null,
        options: field.options || null,
        is_required: field.required || false,
        order_index: index,
      }));

      const { data, error } = await supabase
        .from('registration_custom_fields')
        .insert(fieldsToInsert)
        .select();

      if (error) {
        console.error('Error adding custom fields:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception adding custom fields:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get registration submission count
   */
  async getSubmissionCount(registrationId) {
    try {
      const { count, error } = await supabase
        .from('registration_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('registration_id', registrationId);

      if (error) {
        console.error('Error getting submission count:', error);
        return { success: false, error: error.message };
      }

      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('Exception getting submission count:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all submissions for a registration
   */
  async getRegistrationSubmissions(registrationId) {
    try {
      const { data, error } = await supabase
        .from('registration_submissions')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            profile_picture_url
          )
        `)
        .eq('registration_id', registrationId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Exception fetching submissions:', error);
      return { success: false, error: error.message };
    }
  },
};

export default registrationService;
