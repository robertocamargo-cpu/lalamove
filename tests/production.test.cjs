const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lalamove-regression-'));
const oldCwd = process.cwd();
process.chdir(dir);
process.env.LALAMOVE_DATA_DIR = path.join(dir, 'data');
process.env.LALAMOVE_ENV = 'production';
process.env.LALAMOVE_API_KEY = 'pk_prod_regression_fixture';
process.env.LALAMOVE_API_SECRET = 'sk_prod_regression_fixture';
process.env.LALAMOVE_MOCK_FALLBACK = 'true';
const storage = require('../src/lib/storage.ts');
const client = require('../src/lib/lalamove-client.ts');
const quotes = require('../src/app/api/lalamove/quotations/route.ts');
const orders = require('../src/app/api/lalamove/orders/route.ts');
const cancel = require('../src/app/api/lalamove/orders/[orderId]/cancel/route.ts');
const driverChange = require('../src/app/api/lalamove/orders/[orderId]/change-driver/route.ts');
const fee = require('../src/app/api/lalamove/orders/[orderId]/priority-fee/route.ts');
const edit = require('../src/app/api/lalamove/orders/[orderId]/edit/route.ts');
const settings = require('../src/app/api/settings/route.ts');
const { refreshLiveOrder, mapLiveOrder } = require('../src/lib/lalamove-orders.ts');
const { importLalamoveCsv } = require('../src/lib/lalamove-csv.ts');
const request = body => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const coords = [{lat:'-23.556780',lng:'-46.628890'}, {lat:'-23.561684',lng:'-46.655981'}, {lat:'-23.58',lng:'-46.66'}];
const stops = coords.map((coordinates, i) => ({ coordinates, address: `Address ${i}` }));
const quote = { quotationId:'1234567890123456789', expiresAt:new Date(Date.now()+300000).toISOString(), serviceType:'LALAPRO', priceBreakdown:{ currency:'BRL',base:'10',extraMileage:'2',surcharge:'0',total:'12' }, stops:stops.map((s,i)=>({...s,stopId:`${i+100}`})) };
const realFetch = global.fetch;
after(() => { global.fetch = realFetch; process.chdir(oldCwd); fs.rmSync(dir, {recursive:true,force:true}); });

test('production never substitutes external failures with fictitious deliveries', async t => {
  await t.test('production disables mock fallback even when environment enables it', () => {
    assert.equal(client.getLalamoveConfig().mockFallback, false);
  });
  await t.test('quotation auth failure returns an error and persists no quote', async () => {
    global.fetch = async () => reply({message:'ERR_AUTHENTICATION'},401);
    const res = await quotes.POST(request({ serviceType:'LALAPRO', stops }));
    assert.equal(res.status,502);
    assert.match((await res.json()).error,/401/);
    assert.equal(storage.getQuotationById(quote.quotationId),undefined);
  });
  await t.test('failed geocoding returns an error rather than generated coordinates', async () => {
    global.fetch = async () => reply([]);
    const { GET } = require('../src/app/api/geocode/route.ts');
    const res = await GET(new Request('http://localhost/api/geocode?address=Unknown'));
    assert.equal(res.status,422);
    assert.equal((await res.json()).coordinates,undefined);
  });
  await t.test('tier and schedule are sent to API; optimized stops retain contact indexes', async () => {
    let sent;
    global.fetch = async (url, options) => {
      assert.match(url,/^https:\/\/rest\.lalamove\.com\/v3\/quotations$/);
      sent = JSON.parse(options.body).data;
      return reply({data:{...quote,stops:[quote.stops[0],quote.stops[2],quote.stops[1]]}});
    };
    const scheduleAt = new Date(Date.now()+3600000).toISOString();
    const res = await quotes.POST(request({serviceType:'LALAPRO',deliveryTier:'PRIORITY',isRouteOptimized:true,scheduleAt,stops,item:{weight:'invalid'}}));
    assert.equal(res.status,200);
    const data = await res.json();
    assert.equal(data.apiEnv,'production'); assert.equal(data.isLiveApi,true);
    assert.equal(sent.pricingTierCode,'2'); assert.equal(sent.scheduleAt,scheduleAt); assert.equal(sent.item,undefined);
    assert.deepEqual(data.stops.map(s=>s.originalIndex),[0,2,1]);
    assert.equal(data.priceBreakdown.priorityPrice,undefined);
  });
  const contacts = { quotationId:quote.quotationId,sender:{stopId:'100',name:'Sender',phone:'11947084941'},recipients:[{stopId:'102',name:'Second',phone:'11947084941'},{stopId:'101',name:'First',phone:'11947084941'}] };
  await t.test('failed paid order creation saves no local order', async () => {
    global.fetch = async () => reply({message:'ERR_INSUFFICIENT_CREDIT'},402);
    const res = await orders.POST(request(contacts));
    assert.equal(res.status,402); assert.deepEqual(storage.getAllOrders(),[]);
  });
  await t.test('recipient mismatch blocks paid request before sending to API', async () => {
    global.fetch = async () => { throw new Error('API must not be called'); };
    const res = await orders.POST(request({...contacts,recipients:[...contacts.recipients].reverse()}));
    assert.equal(res.status,400);
  });
  await t.test('simulation is unavailable and never mutates records', async () => {
    const { POST } = require('../src/app/api/lalamove/orders/[orderId]/advance-status/route.ts');
    assert.equal((await POST()).status,410); assert.deepEqual(storage.getAllOrders(),[]);
  });
  const saved = mapLiveOrder({orderId:'9999999999999999999',quotationId:quote.quotationId,status:'ON_GOING',driverId:'123',stops:quote.stops,priceBreakdown:quote.priceBreakdown});
  saved.driver = {id:'123',name:'Existing API data',phone:'',plate:'',vehicleModel:''};
  await t.test('failed cancellation, fee, edit and driver replacement leave order unchanged', async () => {
    storage.saveOrder(saved);
    const before = JSON.stringify(storage.getOrderById(saved.orderId));
    global.fetch = async () => reply({message:'ERR_INVALID_ORDER_STATUS'},409);
    const ctx = {params:{orderId:saved.orderId}};
    const responses = [await cancel.POST(request({}),ctx),await fee.POST(request({fee:'10.00'}),ctx),await edit.PATCH(request({stops:stops.map(s=>({...s,name:'Contact',phone:'+5511947084941'}))}),ctx),await driverChange.POST(request({}),ctx)];
    for (const response of responses) assert.equal(response.status,409);
    assert.equal(JSON.stringify(storage.getOrderById(saved.orderId)),before);
  });
  await t.test('real driver endpoint and uppercase POD fields are mapped; no invented tracking link', async () => {
    global.fetch = async url => url.endsWith('/drivers/123') ? reply({data:{driverId:'123',name:'API supplied',plateNumber:'ABC1234',photo:'https://example.com/driver.jpg'}}) : reply({data:{orderId:saved.orderId,status:'PICKED_UP',driverId:'123',stops:[quote.stops[0],{...quote.stops[1],POD:{status:'SIGNED',image:'https://example.com/signature.png',deliveredAt:'2026-11-26T12:00:00Z'}},quote.stops[2]]}});
    const result = await refreshLiveOrder(saved.orderId);
    assert.equal(result.driver.plate,'ABC1234');assert.equal(result.stops[1].pod.signatureUrl,'https://example.com/signature.png');
    assert.equal(result.stops[1].shareLink,undefined);assert.equal(result.stops[2].status,'PENDING');
  });
  await t.test('CSV preserves 19 digit IDs and actual status without drivers or POD invented from USER', () => {
    const imported = importLalamoveCsv(fs.readFileSync(path.join(root,'Planilha sem título - Brazil.csv'),'utf8'));
    assert.equal(imported.length,41);assert.equal(imported[0].orderId,'3615050452632302203');
    for (const o of imported) {
      assert.equal(o.driver,undefined);assert.equal(o.source,'csv');assert.equal(o.isLiveApi,false);
      for(const s of o.stops) {assert.equal(s.pod,undefined);assert.equal(s.shareLink,undefined);}
    }
    const canceled = importLalamoveCsv('ORDER ID,ORDER STATUS,FINAL CHARGE\n1234567890123456789,Canceled,-10.00');
    assert.equal(canceled[0].status,'CANCELED');assert.equal(canceled[0].priceBreakdown.total,'10.00');
  });
  await t.test('settings masks credentials and empty fields preserve existing secrets', async () => {
    const data = await (await settings.GET()).json();
    assert.equal(data.apiKey,undefined);assert.equal(data.apiSecret,undefined);
    const secret = process.env.LALAMOVE_API_SECRET;
    const res = await settings.POST(request({apiKey:'',apiSecret:'',env:'production',mockFallback:true}));
    assert.equal(res.status,200);assert.equal(process.env.LALAMOVE_API_SECRET,secret);assert.equal(process.env.LALAMOVE_MOCK_FALLBACK,'false');
  });
  await t.test('lost order response blocks duplicate paid submission across retries', async () => {
    const quotationId = '1234567890123456790';
    storage.saveQuotation({ ...storage.getQuotationById(quote.quotationId), quotationId });
    let calls = 0;
    global.fetch = async () => { calls++; throw new Error('Connection lost after request'); };
    const first = await orders.POST(request({ ...contacts, quotationId }));
    assert.equal(first.status,502);assert.equal((await first.json()).submissionUncertain,true);
    const second = await orders.POST(request({ ...contacts, quotationId }));
    assert.equal(second.status,409);assert.equal(calls,1);
    assert.equal(storage.getAllOrders().some(o=>o.quotationId===quotationId),false);
  });
  await t.test('successful cancellation accepts the official empty 204 response', async () => {
    global.fetch = async () => new Response(null,{status:204});
    const res = await cancel.POST(request({}),{params:{orderId:saved.orderId}});
    assert.equal(res.status,200);assert.equal(storage.getOrderById(saved.orderId).status,'CANCELED');
  });
});
