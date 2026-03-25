const { createClient } = require('@supabase/supabase-js')
const supabaseUrl = 'https://qvaxbnrloairpbityuwk.supabase.co'
const supabaseAnonKey = 'sb_publishable_VBF7nMUFBIXws7ES6Qr4Vw_-2z0JXik'

async function checkOperations() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data } = await supabase.from('operations').select('*').limit(1)
    if (data && data.length > 0) {
        console.log('Keys:', Object.keys(data[0]))
        console.log('Sample:', data[0])
    } else {
        console.log('No data')
    }
}
checkOperations()
