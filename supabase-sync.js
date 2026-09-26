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
 reference_code:x.referenceCode||x.refCode||null,plate:x.plate||null,km:x.km!==''&&x.km!=null?Number(x.km)||0:null,color:x.color||null,vehicle_type:x.vehicleType||null,vehicle_subtype:x.vehicleSubtype||null,body_type:x.bodyType||null,pallets:x.pallets?Number(x.pallets):null,body_height:x.bodyHeight?Number(x.bodyHeight):null,body_width:x.bodyWidth?Number(x.bodyWidth):null,body_length:x.bodyLength?Number(x.bodyLength):null,financiado:x.financiado||null,fin_parcelas:x.finParcelas?Number(x.finParcelas):null,fin_parcelas_total:x.finParcelasTotal?Number(x.finParcelasTotal):null,fin_valor:x.finValor?Number(x.finValor):null,fin_vcto:x.finVcto||null,pc:x.pc||null,
 purchase_date:x.purchaseDate||null,purchase_value:x.purchaseValue!==''&&x.purchaseValue!=null?Number(x.purchaseValue)||0:null,
 entry_value:x.entryValue!==''&&x.entryValue!=null?Number(x.entryValue)||0:null,sale_date:x.saleDate||null,
 sale_value:x.saleValue!==''&&x.saleValue!=null?Number(x.saleValue)||0:null,extra_cost:Number(x.extraCost)||0,
 documentation_cost:Number(x.documentationCost)||0,maintenance_cost:Number(x.maintenanceCost)||0,document_path:x.documentPath||null,document_name:x.documentName||null,document_mime:x.documentMime||null,details_open:!!x.detailsOpen,
 retoque:x.retoque==null?null:!!x.retoque,retoque_observacao:x.retoqueObservacao||null,observacoes:x.observacoes||null,
 created_by:x.created_by||null,updated_by:null};
}
function vehicleFromRow(r){
 return {...r,id:r.id,type:r.type,title:r.title,brand:r.brand||'',model:r.model||'',year:r.year||'',fuel:r.fuel||'',code:r.code||'',price:r.price||'',
 priceValue:r.price_value,referenceCode:r.reference_code||'',plate:r.plate||'',km:r.km,color:r.color||'',vehicleType:r.vehicle_type||'',vehicleSubtype:r.vehicle_subtype||'',bodyType:r.body_type||'',pallets:r.pallets??'',bodyHeight:r.body_height??'',bodyWidth:r.body_width??'',bodyLength:r.body_length??'',financiado:r.financiado||'',finParcelas:r.fin_parcelas??'',finParcelasTotal:r.fin_parcelas_total??r.fin_parcelas??'',finValor:r.fin_valor??'',finVcto:r.fin_vcto||'',pc:r.pc||'',purchaseDate:r.purchase_date||'',
 purchaseValue:r.purchase_value,entryValue:r.entry_value,saleDate:r.sale_date||'',saleValue:r.sale_value,extraCost:r.extra_cost||0,
 documentationCost:r.documentation_cost||0,maintenanceCost:r.maintenance_cost||0,documentPath:r.document_path||'',documentName:r.document_name||'',documentMime:r.document_mime||'',detailsOpen:!!r.details_open,retoque:r.retoque,
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
async function deleteVehicleDocument(path){
 if(!sb||!path)return;
 const {error}=await sb.storage.from('vehicle-documents').remove([path]);
 if(error)console.warn('Supabase document delete:',error.message);
}
async function uploadVehicleDocument(vehicleId,file){
 if(!sb||!vehicleId||!file)throw new Error('Documento inválido.');
 const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';
 const path=`vehicles/${vehicleId}/document-${Date.now()}.${ext}`;
 const {data,error}=await sb.storage.from('vehicle-documents').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
 if(error)throw error;
 return {path:data.path,name:file.name,mime:file.type||'application/octet-stream'};
}
window.nikkeiUploadVehicleDocument=async(vehicleId,file)=>{
 const f=JSON.parse(localStorage.getItem('fipeFavorites')||'[]');
 const i=f.findIndex(x=>x.id===vehicleId);
 if(i<0)throw new Error('Veículo não encontrado.');
 if(f[i].documentPath)await deleteVehicleDocument(f[i].documentPath);
 const d=await uploadVehicleDocument(vehicleId,file);
 f[i].documentPath=d.path;f[i].documentName=d.name;f[i].documentMime=d.mime;
 originalSet('fipeFavorites',JSON.stringify(f));
 await syncVehicles('fipeFavorites',f,JSON.stringify(f));
 if(typeof renderStock==='function')renderStock();
};
window.nikkeiDeleteVehicleDocument=async(vehicleId)=>{
 const f=JSON.parse(localStorage.getItem('fipeFavorites')||'[]');
 const i=f.findIndex(x=>x.id===vehicleId);
 if(i<0)return;
 if(f[i].documentPath)await deleteVehicleDocument(f[i].documentPath);
 f[i].documentPath='';f[i].documentName='';f[i].documentMime='';
 originalSet('fipeFavorites',JSON.stringify(f));
 await syncVehicles('fipeFavorites',f,JSON.stringify(f));
 if(typeof renderStock==='function')renderStock();
};
window.nikkeiDownloadVehicleDocument=async(vehicleId)=>{
 const f=JSON.parse(localStorage.getItem('fipeFavorites')||'[]');
 const x=f.find(v=>v.id===vehicleId);
 if(!x?.documentPath)throw new Error('Nenhum documento cadastrado.');
 const {data,error}=await sb.storage.from('vehicle-documents').download(x.documentPath);
 if(error)throw error;
 const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=x.documentName||'documento';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.nikkeiSyncVehicles=(key,next,prev)=>syncVehicles(key,next,prev);
window.nikkeiSyncConsult=item=>syncConsultHistory(item);
window.nikkeiClearHistory=async()=>{if(sb){await sb.from('consult_history').delete().is('user_id',null);}};
async function loadDrivers(){
 if(!sb)return [];
 const {data,error}=await sb.from('drivers').select('*').order('created_at',{ascending:false});
 if(error){console.warn('Supabase drivers:',error.message);return [];}
 const list=(data||[]).map(r=>({id:r.id,name:r.name||'',surname:r.surname||'',address:r.address||'',addressNumber:r.address_number||'',neighborhood:r.neighborhood||'',state:r.state||'',city:r.city||'',phone:r.phone||'',phone2:r.phone2||'',phoneAlt:r.phone_alt||'',cpf:r.cpf||'',rg:r.rg||'',plate:r.plate||'',vehicleType:r.vehicle_type||'',vehicleSubtype:r.vehicle_subtype||'',bodyType:r.body_type||'',vehicleConfiguration:r.vehicle_configuration||'',plateCavalo:r.plate_cavalo||'',plateCarreta:r.plate_carreta||'',plateCarreta2:r.plate_carreta2||'',cnhPath:r.cnh_path||'',cnhName:r.cnh_name||'',cnhMime:r.cnh_mime||''}));
 window.__nikkeiDrivers=list;
 if(typeof renderDrivers==='function')renderDrivers(list);
 return list;
}
function driverPayload(x){
 return {id:x.id||crypto.randomUUID(),name:x.name||'',surname:x.surname||null,address:x.address||null,address_number:x.addressNumber||null,neighborhood:x.neighborhood||null,state:x.state||null,city:x.city||null,phone:x.phone||null,phone2:x.phone2||null,phone_alt:x.phoneAlt||null,cpf:x.cpf||null,rg:x.rg||null,plate:x.plate||null,vehicle_type:x.vehicleType||null,vehicle_subtype:x.vehicleSubtype||null,body_type:x.bodyType||null,vehicle_configuration:x.vehicleConfiguration||null,plate_cavalo:x.plateCavalo||null,plate_carreta:x.plateCarreta||null,plate_carreta2:x.plateCarreta2||null,cnh_path:x.cnhPath||null,cnh_name:x.cnhName||null,cnh_mime:x.cnhMime||null,updated_at:new Date().toISOString()};
}
window.nikkeiLoadDrivers=loadDrivers;
window.nikkeiSaveDriver=async(x)=>{
 if(!sb)throw new Error('Banco de dados indisponível.');
 const row=driverPayload(x);
 const {data,error}=await sb.from('drivers').upsert(row,{onConflict:'id'}).select().single();
 if(error)throw error;
 return {id:data.id,...x,id:data.id};
};
window.nikkeiEditDriver=async(id)=>{
 const x=(window.__nikkeiDrivers||[]).find(v=>v.id===id);if(!x)return;
 currentDriver={...x};
 document.getElementById('driverName').value=x.name||'';
 document.getElementById('driverSurname').value=x.surname||'';
 document.getElementById('driverAddress').value=x.address||'';
 document.getElementById('driverAddressNumber').value=x.addressNumber||'';
 document.getElementById('driverNeighborhood').value=x.neighborhood||'';
 document.getElementById('driverPhone').value=x.phone||'';
 document.getElementById('driverPhone2').value=x.phone2||'';
 document.getElementById('driverPhoneAlt').value=x.phoneAlt||'';
 document.getElementById('driverCpf').value=x.cpf||'';
 document.getElementById('driverRg').value=x.rg||'';
 loadDriverCities(x.state||'',x.city||'');
 document.getElementById('driverCnhStatus').textContent=x.cnhPath?(x.cnhName||'CNH cadastrada'):'Nenhuma CNH';
 renderDriverTypeMenu();
};
window.nikkeiDeleteDriver=async(id)=>{
 if(!confirm('Excluir este motorista?'))return;
 const x=(window.__nikkeiDrivers||[]).find(v=>v.id===id);
 if(x?.cnhPath)await sb.storage.from('driver-documents').remove([x.cnhPath]);
 const {error}=await sb.from('drivers').delete().eq('id',id);
 if(error)throw error;
 await loadDrivers();
};
window.nikkeiUploadDriverCnh=async(id,file)=>{
 if(!sb||!id||!file)throw new Error('CNH inválida.');
 const old=(window.__nikkeiDrivers||[]).find(v=>v.id===id);
 if(old?.cnhPath)await sb.storage.from('driver-documents').remove([old.cnhPath]);
 const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';
 const path='drivers/'+id+'/cnh-'+Date.now()+'.'+ext;
 const {data,error}=await sb.storage.from('driver-documents').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
 if(error)throw error;
 const {error:updateError}=await sb.from('drivers').update({cnh_path:data.path,cnh_name:file.name,cnh_mime:file.type||'application/octet-stream',updated_at:new Date().toISOString()}).eq('id',id);
 if(updateError)throw updateError;
 await loadDrivers();
};
window.nikkeiDownloadDriverCnh=async(id)=>{
 const x=(window.__nikkeiDrivers||[]).find(v=>v.id===id);if(!x?.cnhPath)throw new Error('Nenhuma CNH cadastrada.');
 const {data,error}=await sb.storage.from('driver-documents').download(x.cnhPath);
 if(error)throw error;
 const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=x.cnhName||'CNH';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
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
 await loadDrivers();
 ready=true;
 document.documentElement.classList.remove('auth-pending');
 sb.channel('vehicles-live').on('postgres_changes',{event:'*',schema:'public',table:'vehicles'},()=>{clearTimeout(window.__sbRefresh);window.__sbRefresh=setTimeout(loadVehicles,250)}).subscribe();
}
window.addEventListener('load',init);
})();