import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
    console.log('Checking for patient +254700123456 in Supabase...');
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', '+254700123456')
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            console.error('❌ Patient not found in Supabase.');
        } else {
            console.error('❌ Supabase error:', error.message);
        }
        return;
    }

    console.log('✅ Patient found:', JSON.stringify(data, null, 2));

    // Also check for tasks/referrals if the risk was high
    const { data: tasks } = await supabase.from('tasks').select('*').eq('patient_id', data.id);
    console.log(`Found ${tasks?.length || 0} tasks for this patient.`);
}

verify();
