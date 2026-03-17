import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY is missing in .env.");
    process.exit(1);
}

if (!supabaseUrl.includes('localhost') && !supabaseUrl.includes('127.0.0.1') && process.env.FORCE_SEED !== 'true') {
    console.error("❌ DANGER! Attempting to run seed against a production URL.");
    console.error("❌ Aborting to prevent dummy data injection. Run with FORCE_SEED=true if you really mean to do this.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleTires = [
    { brand: 'CEAT', model: 'Milaze X3', size: '175/65R14', tire_category: 'New', vehicle_type: 'Car', stock: 24, price: 12500, cost_price: 9800, dot_code: '1223', origin: 'Sri Lanka' },
    { brand: 'Michelin', model: 'Primacy 4', size: '205/55R16', tire_category: 'New', vehicle_type: 'SUV / Jeep', stock: 12, price: 34500, cost_price: 28000, dot_code: '4523', origin: 'Thailand' },
    { brand: 'DSI', model: 'Gen X', size: '90/90-12', tire_category: 'New', vehicle_type: 'Motorcycle', stock: 40, price: 5800, cost_price: 4200, dot_code: '0823', origin: 'Sri Lanka' },
    { brand: 'Yokohama', model: 'BlueEarth', size: '195/65R15', tire_category: 'New', vehicle_type: 'Car', stock: 16, price: 21000, cost_price: 17500, dot_code: '2223', origin: 'Japan' },
    { brand: 'CEAT', model: 'Winmile AW', size: '10.00R20', tire_category: 'New', vehicle_type: 'Lorry (Heavy)', stock: 8, price: 85000, cost_price: 72000, dot_code: '1523', origin: 'Sri Lanka' }
];

const sampleCustomers = [
    { name: 'Kamal Perera', phone: '0771234567', vehicle_number: 'WP CAB-1234', email: 'kamal@example.com' },
    { name: 'Sunil Shantha', phone: '0719876543', vehicle_number: 'CP LD-5678', email: 'sunil@example.com' },
    { name: 'Nimal Silva', phone: '0755554444', vehicle_number: 'WP BAR-9988', email: 'nimal@example.com' }
];

const sampleWorkers = [
    { name: 'Aruna', role: 'Technician', phone: '0770001111', status: 'available' },
    { name: 'Sampath', role: 'Technician', phone: '0770002222', status: 'available' },
    { name: 'Kasun', role: 'Helper', phone: '0770003333', status: 'available' }
];

async function seed() {
    console.log("🚀 Starting database seeding to Supabase...");

    try {
        const tireIds = [];
        console.log("📦 Seeding Tires...");
        for (const tire of sampleTires) {
            const { data, error } = await supabase.from('tires').insert([{ ...tire, created_at: new Date().toISOString() }]).select();
            if (error) throw error;
            tireIds.push(data[0].id);
            console.log(` ✅ Added ${tire.brand} ${tire.model}`);
        }

        console.log("👥 Seeding Customers...");
        for (const customer of sampleCustomers) {
            const { error } = await supabase.from('customers').insert([{ ...customer, created_at: new Date().toISOString() }]);
            if (error) throw error;
            console.log(` ✅ Added ${customer.name}`);
        }

        console.log("🛠️ Seeding Workers...");
        for (const worker of sampleWorkers) {
            const { error } = await supabase.from('workers').insert([{ ...worker, created_at: new Date().toISOString() }]);
            if (error) throw error;
            console.log(` ✅ Added ${worker.name}`);
        }

        console.log("💰 Seeding Sales...");
        const now = new Date();
        for (let i = 0; i < 20; i++) {
            const saleDate = new Date();
            saleDate.setDate(now.getDate() - Math.floor(Math.random() * 30));
            const quantity = Math.floor(Math.random() * 4) + 1;
            const unitPrice = 15000 + (Math.random() * 10000);
            const total = unitPrice * quantity;
            const tireIdx = Math.floor(Math.random() * tireIds.length);

            const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
                created_at: saleDate.toISOString(),
                total: total,
                payment_method: 'Cash',
                customer_name: sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)].name,
                vehicle_number: 'WP GA-' + (1000 + i),
                profit: total * 0.25
            }]).select();

            if (saleError) throw saleError;

            const { error: itemError } = await supabase.from('sale_items').insert([{
                sale_id: saleData[0].id,
                tire_id: tireIds[tireIdx],
                quantity: quantity,
                price: unitPrice,
                subtotal: total
            }]);
            if (itemError) throw itemError;
        }
        console.log(" ✅ Added 20 sample sale records with line items");

        console.log("\n✨ Supabase seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Seeding failed:", JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

seed();
