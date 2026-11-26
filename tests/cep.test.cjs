const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { StopForm } = require('../src/components/StopForm.tsx');
const { formatCep } = require('../src/lib/stop-address.ts');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

function find(node, predicate) {
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } }
  else if (node && typeof node === 'object') {
    if (predicate(node)) return node;
    if (typeof node.type === 'function') return find(node.type(node.props), predicate);
    return find(node.props?.children, predicate);
  }
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node === 'string') return node;
  return node?.props ? text(node.props.children) : '';
}
function form(cep = '0131010') {
  let stops = [
    { id:'warehouse',isWarehouse:true,isOrigin:true,name:'Nevine',phone:'',cep:'01514-001',number:'557',street:'Rua do Glicério',address:'Rua do Glicério, 557 - São Paulo - SP',coordinates:{lat:'-23.556780',lng:'-46.628890'} },
    { id:'customer',name:'Contato',phone:'',cep,number:'',address:'',coordinates:{lat:'',lng:''} },
  ];
  const initial = JSON.parse(JSON.stringify(stops));
  const hooks = []; let hookIndex = 0;
  const setStops = update => { stops = typeof update === 'function' ? update(stops) : update; };
  const render = () => {
    hookIndex = 0;
    const saved = { useState:React.useState, useRef:React.useRef, useEffect:React.useEffect };
    React.useEffect = () => {};
    React.useState = init => {
      const i = hookIndex++;
      if (!(i in hooks)) hooks[i] = typeof init === 'function' ? init() : init;
      return [hooks[i], update => { hooks[i] = typeof update === 'function' ? update(hooks[i]) : update; }];
    };
    React.useRef = init => {
      const i = hookIndex++;
      if (!(i in hooks)) hooks[i] = {current:init};
      return hooks[i];
    };
    try { return StopForm({ stops,setStops,isRouteOptimized:true,setIsRouteOptimized(){} }); }
    finally { Object.assign(React,saved); }
  };
  const input = label => {
    const match = find(render(), n => n.type === 'input' && n.props['aria-label'] === label);
    assert.ok(match,`Missing input ${label}`); return match;
  };
  return {render,input,initial,get stops(){return stops;},setStops};
}
const address = {street:'Avenida Paulista',neighborhood:'Bela Vista',city:'São Paulo',state:'SP'};
const response = data => new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});

test('CEP retains all eight digits after the automatic lookup and preserves edits made while loading', async () => {
  const f = form(); const initial = f.stops;
  let resolve;
  global.fetch = async () => await new Promise(done=>{resolve=done;});
  const pending = f.input('CEP do destino 1').props.onChange({target:{value:'01310100'}});
  assert.equal(f.stops[1].cep,'01310-100');
  const name = find(f.render(), n=>n.type==='input' && n.props.value==='Contato');
  name.props.onChange({target:{value:'Nome atualizado'}});
  f.input('Número do destino 1').props.onChange({target:{value:'1000'}});
  resolve(response(address)); await pending;
  assert.equal(f.stops[1].cep.replace(/\D/g,''),'01310100');
  assert.equal(f.stops[1].name,'Nome atualizado');
  assert.equal(f.stops[1].number,'1000');
  assert.equal(f.stops[1].address,'Avenida Paulista, 1000 - Bela Vista - São Paulo - SP - CEP 01310-100');
  assert.deepEqual(initial,f.initial,'Existing state must not be mutated');
});

test('CEP accepts eight digits with leading zero, with or without a hyphen', () => {
  assert.equal(formatCep('01514001'),'01514-001');
  assert.equal(formatCep('01514-001'),'01514-001');
  assert.equal(formatCep(' 01514-001 '),'01514-001');
});

test('out-of-order CEP responses cannot replace the current address or discard the last digit', async () => {
  const f = form(); const pending = [];
  global.fetch = async () => await new Promise(resolve=>pending.push(resolve));
  const first = f.input('CEP do destino 1').props.onChange({target:{value:'01310100'}});
  const second = f.input('CEP do destino 1').props.onChange({target:{value:'01514001'}});
  pending[1](response({...address,street:'Rua do Glicério'}));await second;
  pending[0](response(address));await first;
  assert.equal(f.stops[1].cep,'01514-001');assert.equal(f.stops[1].street,'Rua do Glicério');
});

test('CEP lookup follows the stop when the route is inverted', async () => {
  const f = form(); let resolve;
  global.fetch = async () => await new Promise(done=>{resolve=done;});
  const pending = f.input('CEP do destino 1').props.onChange({target:{value:'01310100'}});
  f.setStops(stops=>[stops[1],stops[0]]);
  resolve(response(address));await pending;
  assert.equal(f.stops[0].id,'customer');assert.equal(f.stops[0].cep,'01310-100');
  assert.equal(f.stops[1].street,'Rua do Glicério');
});

test('manual address correction survives a delayed CEP response', async () => {
  const f = form(); let resolve;
  global.fetch = async () => await new Promise(done=>{resolve=done;});
  const pending = f.input('CEP do destino 1').props.onChange({target:{value:'01310100'}});
  const input = f.input('Rua / Logradouro do destino 1');
  input.props.onChange({target:{value:'Endereço corrigido, 123'}});
  resolve(response(address));await pending;
  assert.match(f.stops[1].address,/^Endereço corrigido, 123/);
});

test('origin CEP also retains the eighth digit after lookup', async () => {
  const f = form();
  const edit = find(f.render(),n=>n.type==='button' && text(n)==='Alterar Origem');
  edit.props.onClick();
  global.fetch = async () => response({...address,street:'Rua do Glicério'});
  await f.input('CEP da origem').props.onChange({target:{value:'01514001'}});
  assert.equal(f.stops[0].cep,'01514-001');assert.match(f.stops[0].address,/, 557/);
});

test('complement entered during CEP lookup is preserved in the complete address below the fields', async()=>{
  const f=form();let resolve;
  global.fetch=async()=>await new Promise(done=>{resolve=done;});
  const pending=f.input('CEP do destino 1').props.onChange({target:{value:'01310100'}});
  f.input('Número do destino 1').props.onChange({target:{value:'1000'}});
  f.input('Complemento do destino 1').props.onChange({target:{value:'Sala 12, bloco B'}});
  resolve(response(address));await pending;
  const preview=find(f.render(),n=>n.type==='output'&&n.props['aria-label']==='Endereço completo do destino 1');
  assert.ok(preview);assert.match(text(preview),/Avenida Paulista, 1000 - Sala 12, bloco B/);
  assert.equal(f.stops[1].complement,'Sala 12, bloco B');
});
