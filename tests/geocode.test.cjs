const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { geocodeAddress } = require('../src/lib/geocode.ts');
const { formatStopAddress, formatDeliveryRemarks } = require('../src/lib/stop-address.ts');
const realFetch = global.fetch;
afterEach(()=>{global.fetch=realFetch;});
const response = data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const location = {lat:'-23.5',lon:'-46.6',type:'house',address:{house_number:'263'}};

test('structured geocoding keeps the house number and excludes complement and district from search', async()=>{
  let query;
  global.fetch=async url=>{query=new URL(url).searchParams;return response([location]);};
  const fields={street:'Rua de Exemplo A',number:'263',city:'São Paulo',state:'SP',cep:'03054-050',complement:'Sala 12'};
  const result=await geocodeAddress('Rua de Exemplo A, 263 - Sala 12 - Bairro - São Paulo - SP',fields);
  assert.equal(query.get('street'),'263 Rua de Exemplo A');assert.equal(query.get('postalcode'),'03054050');
  assert.equal(query.has('q'),false);assert.equal(String(query).includes('Sala'),false);
  assert.deepEqual(result,{lat:location.lat,lng:location.lon});
});

test('missing postcode index retries street, house number and city without changing the destination', async()=>{
  const calls=[];
  global.fetch=async url=>{calls.push(new URL(url).searchParams);return response(calls.length===1?[]:[location]);};
  await geocodeAddress('Rua de Exemplo B, 263 - São Paulo - SP', {street:'Rua de Exemplo B',number:'263',city:'São Paulo',state:'SP',cep:'03054050'});
  assert.equal(calls.length,2);assert.equal(calls[0].get('postalcode'),'03054050');assert.equal(calls[1].has('postalcode'),false);
  assert.equal(calls[1].get('street'),'263 Rua de Exemplo B');assert.equal(calls[1].get('city'),'São Paulo');
});

test('text search is a final alternative with street and number, without apartment or neighbourhood', async()=>{
  const calls=[];
  global.fetch=async url=>{calls.push(new URL(url).searchParams);return response(calls.length===3?[location]:[]);};
  await geocodeAddress('Rua de Exemplo C, 263 - Bloco Azul - Bairro', {street:'Rua de Exemplo C',number:'263',city:'São Paulo',state:'SP',cep:'03054050',complement:'Bloco Azul'});
  assert.equal(calls.length,3);assert.equal(calls[2].get('q'),'Rua de Exemplo C, 263, São Paulo, SP, Brasil');
});

test('map failure does not declare address invalid or use city centre coordinates', async()=>{
  global.fetch=async()=>response([{...location,type:'city'}]);
  await assert.rejects(geocodeAddress('Cidade de Exemplo'),/endereço pode ser válido/);
});

test('a different house number cannot silently replace the requested number', async()=>{
  global.fetch=async()=>response([{...location,address:{house_number:'999'}}]);
  await assert.rejects(geocodeAddress('Rua de Exemplo D, 263', {street:'Rua de Exemplo D',number:'263',city:'São Paulo'}),/localização ainda não pôde ser confirmada/);
});

test('changing only complement reuses the confirmed physical location', async()=>{
  let calls=0;
  global.fetch=async()=>{calls++;return response([location]);};
  const fields={street:'Rua de Exemplo E',number:'263',city:'São Paulo',state:'SP'};
  await geocodeAddress('Rua de Exemplo E, 263 - Apto 1',fields);
  await geocodeAddress('Rua de Exemplo E, 263 - Apto 2',fields);
  assert.equal(calls,1);
});

test('full address and delivery instructions retain complement exactly',()=>{
  const stop={street:'Rua de Exemplo',number:'263',complement:'Bloco B, apto 12',neighborhood:'Bairro',city:'São Paulo',state:'SP',cep:'03054050',remarks:'Retirar mochila'};
  assert.equal(formatStopAddress(stop),'Rua de Exemplo, 263 - Bloco B, apto 12 - Bairro - São Paulo - SP - CEP 03054-050');
  assert.equal(formatDeliveryRemarks(stop),'Complemento: Bloco B, apto 12\r\nRetirar mochila');
});
