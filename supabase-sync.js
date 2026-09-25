(function(){
'use strict';
const SUPABASE_URL='https://qincxigrvlvudsqcukxt.supabase.co';
const SUPABASE_KEY='sb_publishable_e3bIXsAi37nk21uMohyC5Q_DM1mhYE2';
const AUTH_REDIRECT='https://takahashinikkei.github.io/Nikkeibrasil/';
if((location.hostname==='localhost'||location.hostname==='127.0.0.1')&&location.hash.includes('access_token=')){location.replace(AUTH_REDIRECT+location.hash);return;}
let sb=null,user=null,syncing=false,ready=false;
const originalSet=localStorage.setItem.bind(localStorage),originalRemove=localStorage.removeItem.bind(localStorage);
const esc2=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const keyStatus=k=>k==='fipeFavorites'?'stock':k==='fipeNegotiations'?'progress':k==='fipeSold'?'sold':null;
function vehiclePayload(x,status){
 return {id:x.id||crypto.randomUUID(),status,type:x.type||'cars',title:x.title||'Veículo',brand:x.brand||null,model:x.model||null,
 year:x.year!=null?String(x.year):null,fuel:x.fuel||null,code:x.code||null,price:x.price||null,price_value:x.priceValue!=null?Number(x.priceValue)||null:null,
 reference_code:x.referenceCode||x.refCode||null,plate:x.plate||null,km:x.km!==''&&x.km!=null?Number(x.km)||0:null,color:x.color||null,vehicle_type:x.vehicleType||null,vehicle_subtype:x.vehicleSubtype||null,body_type:x.bodyType||null,pallets:x.pallets?Number(x.pallets):null,body_height:x.bodyHeight?Number(x.bodyHeight):null,body_width:x.bodyWidth?Number(x.bodyWidth):null,body_length:x.bodyLength?Number(x.bodyLength):null,financiado:x.financiado||null,fin_parcelas:x.finParcelas?Number(x.finParcelas):null,fin_valor:x.finValor?Number(x.finValor):null,fin_vcto:x.finVcto||null,pc:x.pc||null,
 purchase_date:x.purchaseDate||null,purchase_value:x.purchaseValue!==''&&x.purchaseValue!=null?Number(x.purchaseValue)||0:null,
 entry_value:x.entryValue!==''&&x.entryValue!=null?Number(x.entryValue)||0:null,sale_date:x.saleDate||null,
 sale_value:x.saleValue!==''&&x.saleValue!=null?Number(x.saleValue)||0:null,extra_cost:Number(x.extraCost)||0,
 documentation_cost:Number(x.documentationCost)||0,maintenance_cost:Number(x.maintenanceCost)||0,details_open:!!x.detailsOpen,
 retoque:x.retoque==null?null:!!x.retoque,retoque_observacao:x.retoqueObservacao||null,observacoes:x.observacoes||null,
 created_by:x.created_by||null,updated_by:null};
}
function vehicleFromRow(r){
 return {...r,id:r.id,type:r.type,title:r.title,brand:r.brand||'',model:r.model||'',year:r.year||'',fuel:r.fuel||'',code:r.code||'',price:r.price||'',
 priceValue:r.price_value,referenceCode:r.reference_code||'',plate:r.plate||'',km:r.km,color:r.color||'',vehicleType:r.vehicle_type||'',vehicleSubtype:r.vehicle_subtype||'',bodyType:r.body_type||'',pallets:r.pallets??'',bodyHeight:r.body_height??'',bodyWidth:r.body_width??'',bodyLength:r.body_length??'',financiado:r.financiado||'',finParcelas:r.fin_parcelas??'',finValor:r.fin_valor??'',finVcto:r.fin_vcto||'',pc:r.pc||'',purchaseDate:r.purchase_date||'',
 purchaseValue:r.purchase_value,entryValue:r.entry_value,saleDate:r.sale_date||'',saleValue:r.sale_value,extraCost:r.extra_cost||0,
 documentationCost:r.documentation_cost||0,maintenanceCost:r.maintenance_cost||0,detailsOpen:!!r.details_open,retoque:r.retoque,
 retoqueObservacao:r.retoque_observacao||'',observacoes:r.observacoes||''};
}
function replaceCache(k,items){syncing=true;try{originalSet(k,JSON.stringify(items));}finally{syncing=false;}}
async function loadVehicles(){
 if(!sb)return;
 const {data,error}=await sb.from('vehicles').select('*').order('created_at',{ascending:false});
 if(error){console.warn('Supabase vehicles:',error.message);return;}
 replaceCache('fipeFavorites',data.filter(x=>x.status==='stock').map(vehicleFromRow));
 replaceCache('fipeNegotiations',data.filter(x=>x.status==='progress').map(vehicleFromRow));
 replaceCache('fipeSold',data.filter(x=>x.status==='sold').map(vehicleFromRow));
 if(typeof renderFavorites==='function')renderFavorites();
 if(typeof renderNegotiations==='function')renderNegotiations();
 if(typeof renderSold==='function')renderSold();
 if(typeof renderStock==='function'&&document.getElementById('stockPage')?.style.display!=='none')renderStock();
 if(typeof updateFavoriteButton==='function')updateFavoriteButton();
 return data;
}
async function syncVehicles(key,next,prev){
 if(!sb||syncing)return;
 const status=keyStatus(key);if(!status)return;
 let old=[];try{old=JSON.parse(prev||'[]')}catch{}
 const rows=next.map(x=>vehiclePayload(x,status));
 const ids=new Set(rows.map(x=>x.id));
 for(const row of rows){const {error}=await sb.from('vehicles').upsert(row,{onConflict:'id'});if(error){console.warn('Supabase save vehicle:',error.message);return;}}
 const removed=old.map(x=>x.id).filter(Boolean).filter(id=>!ids.has(id));
 if(removed.length){const {error}=await sb.from('vehicles').delete().in('id',removed).eq('status',status);if(error)console.warn('Supabase delete vehicle:',error.message);}
}
async function migrateLegacy(){
 if(!sb)return;
 const legacy=[['fipeFavorites','stock'],['fipeNegotiations','progress'],['fipeSold','sold']];
 const {data:existing}=await sb.from('vehicles').select('id').limit(1);
 if(!existing?.length){
  for(const [k,status] of legacy){let arr=[];try{arr=JSON.parse(localStorage.getItem(k)||'[]')}catch{}if(arr.length)await syncVehicles(k,arr,'[]');}
 }
 const {data:h}=await sb.from('consult_history').select('id').limit(1);
 if(!h?.length){let arr=[];try{arr=JSON.parse(localStorage.getItem('fipeConsults')||'[]')}catch{}for(const x of arr.slice(0,30).reverse())await syncConsultHistory(x);}
}
async function loadHistory(){
 if(!sb)return;
 const {data,error}=await sb.from('consult_history').select('*').order('consulted_at',{ascending:false}).limit(30);
 if(error){console.warn('Supabase history:',error.message);return;}
 replaceCache('fipeConsults',data.map(x=>({...x,type:x.type,title:x.title,brand:x.brand||'',model:x.model||'',year:x.year||'',fuel:x.fuel||'',code:x.code||'',price:x.price||'',priceValue:x.price_value,referenceCode:x.reference_code,ref:x.reference_code,at:x.consulted_at})));
 if(typeof renderConsults==='function')renderConsults();
}
async function syncConsultHistory(item){
 if(!sb||syncing||!item)return;
 const x=item;
 const {error}=await sb.from('consult_history').insert({user_id:null,type:x.type||'cars',title:x.title||'Veículo',brand:x.brand||null,model:x.model||null,
 year:x.year!=null?String(x.year):null,fuel:x.fuel||null,code:x.code||null,price:x.price||null,price_value:x.priceValue!=null?Number(x.priceValue)||null:null,
 reference_code:x.referenceCode||x.refCode||x.ref||null,consulted_at:x.at||new Date().toISOString()});
 if(error)console.warn('Supabase history save:',error.message);
}
window.nikkeiSyncVehicles=(key,next,prev)=>syncVehicles(key,next,prev);
window.nikkeiSyncConsult=item=>syncConsultHistory(item);
window.nikkeiClearHistory=async()=>{if(sb){await sb.from('consult_history').delete().is('user_id',null);}};
function patchStorage(){
 localStorage.setItem=function(k,v){
  const prev=localStorage.getItem(k);originalSet(k,v);
  if(syncing||!ready)return;
  if(['fipeFavorites','fipeNegotiations','fipeSold'].includes(k)){
   let next=[];try{next=JSON.parse(v||'[]')}catch{return}
   next=next.map(x=>({...x,id:x.id||crypto.randomUUID()}));
   syncing=true;try{originalSet(k,JSON.stringify(next));}finally{syncing=false}
   syncVehicles(k,next,prev);
  }else if(k==='fipeConsults'){let h=[];try{h=JSON.parse(v||'[]')}catch{return}syncConsultHistory(h[0]);}
 };
 localStorage.removeItem=function(k){
  const prev=localStorage.getItem(k);originalRemove(k);
  if(syncing||!ready)return;
  if(['fipeFavorites','fipeNegotiations','fipeSold'].includes(k)){
   const ids=(()=>{try{return JSON.parse(prev||'[]').map(x=>x.id).filter(Boolean)}catch{return[]}})();
   if(ids.length)sb.from('vehicles').delete().in('id',ids).eq('status',keyStatus(k));
  }
  if(k==='fipeConsults')sb.from('consult_history').delete().is('user_id',null);
 };
}
async function init(){
 document.documentElement.classList.add('auth-pending');
 if(!window.supabase?.createClient){console.error('Supabase JS não carregado');document.documentElement.classList.remove('auth-pending');return;}
 sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 patchStorage();
 user=null;
 await migrateLegacy();
 await loadVehicles();
 await loadHistory();
 ready=true;
 document.documentElement.classList.remove('auth-pending');
 sb.channel('vehicles-live').on('postgres_changes',{event:'*',schema:'public',table:'vehicles'},()=>{clearTimeout(window.__sbRefresh);window.__sbRefresh=setTimeout(loadVehicles,250)}).subscribe();
}
window.addEventListener('load',init);
})();