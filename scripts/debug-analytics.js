
const CREDENTIALS = { username: 'test_analyst', password: 'DemoAnalyst2024!' };

async function run() {
    // Try 3001 as frontend is 3000
    const API_URL = 'http://localhost:3001';
    console.log(`Targeting ${API_URL}`);

    try {
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CREDENTIALS)
        });

        if (!loginRes.ok) {
            const txt = await loginRes.text();
            console.log(`Login failed on ${API_URL}: ${loginRes.status} ${txt}`);
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful.');
        console.log('User Scope:', loginData.user.geographicScope);

        // 2. Fetch Data
        console.log('Fetching MH data...');
        const dataRes = await fetch(`${API_URL}/analytics/aggregates/state?stateCode=MH`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!dataRes.ok) {
            console.log('Data fetch failed:', dataRes.status, await dataRes.text());
            return;
        }

        const data = await dataRes.json();
        // console.dir(data, { depth: null });

        // Stats
        if (data.data) {
            console.log('\n--- DATA DISTRIBUTION ---');
            const aggs = data.data;
            const total = aggs.reduce((sum, item) => sum + item.noisy_population, 0);
            console.log('Total Population Estimate:', total);
            aggs.forEach(item => {
                const p = (item.noisy_population / total) * 100;
                console.log(`${item.caste_category}: ${item.noisy_population} (~${p.toFixed(2)}%)`);
            });
            console.log('-------------------------');
        } else {
            console.log('No data.data found in response.');
            console.log(data);
        }

    } catch (e) {
        console.error('Error:', e.message);
        if (e.cause) console.error(e.cause);
    }
}

run();
