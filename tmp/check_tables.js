const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qvaxbnrloairpbityuwk.supabase.co'
const supabaseAnonKey = 'sb_publishable_VBF7nMUFBIXws7ES6Qr4Vw_-2z0JXik'

async function checkTables() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: opData } = await supabase.from('operations').select('*')
    console.log('Operations:', opData ? opData.length : 'NULL')
    if (opData && opData.length > 0) {
        console.log('Sample op history:', opData[0].history)
    }
}
checkTables()
