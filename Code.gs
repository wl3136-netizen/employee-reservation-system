'use strict';

/** Apps Script 프로젝트 속성에 SPREADSHEET_ID 키로 실제 ID를 저장하세요. */
const CONFIG={TIME_ZONE:'Asia/Seoul',SESSION_TTL_SECONDS:21600,SCHEDULE:{'2026-09-30':['티에스이 2사업장','지엠테스트'],'2026-10-01':['티에스이 2사업장','지엠테스트'],'2026-10-02':['티에스이 2사업장','메가센'],'2026-10-06':['메가터치(티에스이)'],'2026-10-07':['메가터치','메가터치(티에스이)'],'2026-10-08':['메가센(티에스이)'],'2026-10-12':['티에스이 3사업장','메가센'],'2026-10-13':['티에스이 3사업장'],'2026-10-15':['타이거일렉 사업장'],'2026-10-16':['티에스이 3사업장','타이거일렉 사업장'],'2026-10-19':['엘디티(티에스이)'],'2026-10-20':['엘디티(티에스이)'],'2026-10-21':['티에스이 3사업장'],'2026-10-22':['티에스이 3사업장'],'2026-10-23':['티에스이 3사업장'],'2026-10-26':['엘디티'],'2026-10-27':['엘디티'],'2026-10-28':['엘디티(티에스이)']},SHEETS:{USERS:'Users',DEPARTMENTS:'Departments',SLOTS:'AvailableSlots',RESERVATIONS:'Reservations',MASTERS:'Masters'}};
const HEADERS={Users:['userId','company','departmentId','name','enabled'],Departments:['departmentId','company','departmentName','enabled'],AvailableSlots:['slotId','date','startTime','endTime','enabled','location'],Reservations:['reservationId','date','startTime','endTime','userId','company','name','departmentId','status','createdAt','location'],Masters:['company','departmentName','name','enabled']};

function doGet(){return json_({success:true,data:{service:'Reservation API',status:'ok'}})}
function doPost(e){try{const req=JSON.parse((e.postData&&e.postData.contents)||'{}');if(!req.action)throw new AppError('action이 필요합니다.');const handlers={login:login_,enableAdminMode:enableAdminMode_,getSession:getSession_,getAvailableDates:getAvailableDates_,getAvailableSlots:getAvailableSlots_,getCalendarMonth:getCalendarMonth_,getCalendarAll:getCalendarAll_,createReservation:createReservation_,getMyReservations:getMyReservations_,cancelReservation:cancelReservation_,getUsers:getUsers_,saveUser:saveUser_,getDepartments:getDepartments_,saveDepartment:saveDepartment_,getAvailability:getAvailability_,saveAvailability:saveAvailability_,getAllReservations:getAllReservations_,cancelReservationByMaster:cancelReservationByMaster_};if(!handlers[req.action])throw new AppError('지원하지 않는 요청입니다.');return json_({success:true,data:handlers[req.action](req)})}catch(err){console.error(err.stack||err);return json_({success:false,message:err instanceof AppError?err.message:'서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'})}}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
function AppError(message){this.name='AppError';this.message=message}AppError.prototype=Object.create(Error.prototype);

function ss_(){const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('SPREADSHEET_ID가 설정되지 않았습니다.');return SpreadsheetApp.openById(id)}
function sheet_(name){const sh=ss_().getSheetByName(name);if(!sh)throw new Error(`${name} 시트가 없습니다.`);return sh}
function rows_(name){const sh=sheet_(name),last=sh.getLastRow();if(last<2)return[];const headers=HEADERS[name],values=sh.getRange(2,1,last-1,headers.length).getDisplayValues();return values.filter(r=>r.some(v=>v!=='' )).map((r,i)=>{const o={_row:i+2};headers.forEach((h,j)=>o[h]=r[j]);return o})}
function bool_(v){return v===true||String(v).toUpperCase()==='TRUE'||String(v)==='1'}
function requiredText_(v,label){v=String(v||'').trim();if(!v)throw new AppError(`${label}을(를) 입력해 주세요.`);if(v.length>100)throw new AppError(`${label}이(가) 너무 깁니다.`);return v}
function validDate_(v){v=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(new Date(`${v}T00:00:00+09:00`).getTime()))throw new AppError('날짜 형식이 올바르지 않습니다.');return v}
function validTime_(v){v=String(v||'');if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v))throw new AppError('시간 형식이 올바르지 않습니다.');return v}
function normalizeDate_(v){if(v instanceof Date)return Utilities.formatDate(v,CONFIG.TIME_ZONE,'yyyy-MM-dd');const s=String(v||'').trim();const m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);return m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:s}
function normalizeTime_(v){if(v instanceof Date)return Utilities.formatDate(v,CONFIG.TIME_ZONE,'HH:mm');const s=String(v||'').trim();const m=s.match(/^(\d{1,2}):(\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}`:s}
function nowKey_(){return Utilities.formatDate(new Date(),CONFIG.TIME_ZONE,'yyyy-MM-dd HH:mm')}
function isPast_(date,time){return `${date} ${time}`<=nowKey_()}
function isBookableDate_(date){date=validDate_(normalizeDate_(date));const day=new Date(`${date}T00:00:00+09:00`).getDay();return day!==0&&day!==6&&scheduleLocations_(date).length>0}
/** 날짜별 사업장 목록. 괄호 안 회사명이 있으면 그 회사, 없으면 첫 단어의 회사 소속만 예약할 수 있습니다. 예: 엘디티(티에스이) → 티에스이 */
function scheduleLocations_(date){return CONFIG.SCHEDULE[date]||[]}
function locationCompany_(location){const s=String(location||'').trim(),m=s.match(/\(([^)]+)\)/);return m?m[1].trim():s.split(/\s+/)[0]}
function slotView_(s){return{slotId:s.slotId,date:normalizeDate_(s.date),startTime:normalizeTime_(s.startTime),endTime:normalizeTime_(s.endTime),location:String(s.location||'').trim()}}
function isSlotOpenFor_(s,company){if(!bool_(s.enabled)||!isBookableDate_(s.date))return false;const location=String(s.location||'').trim();return scheduleLocations_(normalizeDate_(s.date)).includes(location)&&(company===null||locationCompany_(location)===company)}
function slotKey_(date,start,end,location){return `${date}|${start}|${end}|${String(location||'').trim()}`}
function activeSlotKeys_(){return new Set(rows_(CONFIG.SHEETS.RESERVATIONS).filter(r=>r.status==='ACTIVE').map(r=>slotKey_(normalizeDate_(r.date),normalizeTime_(r.startTime),normalizeTime_(r.endTime),r.location)))}
function openSlotsFor_(company){const active=activeSlotKeys_();return rows_(CONFIG.SHEETS.SLOTS).filter(s=>isSlotOpenFor_(s,company)).map(slotView_).map(s=>({...s,available:!isPast_(s.date,s.startTime)&&!active.has(slotKey_(s.date,s.startTime,s.endTime,s.location))})).sort((x,y)=>`${x.date} ${x.startTime} ${x.location}`.localeCompare(`${y.date} ${y.startTime} ${y.location}`))}
function validMonth_(req){const year=Number(req.year),month=Number(req.month);if(!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(month)||month<1||month>12)throw new AppError('조회 월이 올바르지 않습니다.');return `${year}-${String(month).padStart(2,'0')}-`}
function uuid_(){return Utilities.getUuid()}

function findUser_(company,name){return rows_(CONFIG.SHEETS.USERS).find(r=>r.company===company&&r.name===name)}
function findUserById_(userId){return rows_(CONFIG.SHEETS.USERS).find(r=>r.userId===userId)}
function departmentMap_(){const map={};rows_(CONFIG.SHEETS.DEPARTMENTS).forEach(r=>map[r.departmentId]=r);return map}
function isMasterUser_(user){const dept=departmentMap_()[user.departmentId];return rows_(CONFIG.SHEETS.MASTERS).some(r=>r.company===user.company&&r.name===user.name&&r.departmentName===(dept?dept.departmentName:'')&&bool_(r.enabled))}
function createSession_(user,isMaster){const token=uuid_(),payload={userId:user.userId,isMaster:!!isMaster,nonce:uuid_()};CacheService.getScriptCache().put(`session:${token}`,JSON.stringify(payload),CONFIG.SESSION_TTL_SECONDS);return token}
function auth_(req,masterOnly){const token=String(req.token||'');if(!token)throw new AppError('로그인이 필요합니다.');const raw=CacheService.getScriptCache().get(`session:${token}`);if(!raw)throw new AppError('로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');const payload=JSON.parse(raw),user=findUserById_(payload.userId);if(!user||!bool_(user.enabled))throw new AppError('사용할 수 없는 계정입니다.');const isMaster=!!payload.isMaster&&isMasterUser_(user);if(masterOnly&&!isMaster)throw new AppError('관리자 권한이 필요합니다.');CacheService.getScriptCache().put(`session:${token}`,raw,CONFIG.SESSION_TTL_SECONDS);return{user,isMaster}}
function publicUser_(user,isMaster){const dept=departmentMap_()[user.departmentId];return{userId:user.userId,company:user.company,name:user.name,departmentId:user.departmentId,departmentName:dept?dept.departmentName:'',isMaster}}

function login_(req){const company=requiredText_(req.company,'회사명'),name=requiredText_(req.name,'이름'),user=findUser_(company,name);if(!user)throw new AppError('등록되지 않은 회사명 또는 이름입니다.');if(!bool_(user.enabled))throw new AppError('사용이 중지된 계정입니다. 관리자에게 문의해 주세요.');return{token:createSession_(user,false),user:publicUser_(user,false)}}
function enableAdminMode_(req){const a=auth_(req,false),expected=PropertiesService.getScriptProperties().getProperty('ADMIN_ACCESS_CODE');if(!expected||String(req.adminCode||'')!==expected||!isMasterUser_(a.user))throw new AppError('관리자 정보 또는 코드가 올바르지 않습니다.');const token=createSession_(a.user,true);return{token,user:publicUser_(a.user,true)}}
function getSession_(req){const a=auth_(req,false);return{user:publicUser_(a.user,a.isMaster)}}
function slotCompanyFilter_(a){return a.isMaster?null:a.user.company}
function getAvailableDates_(req){const a=auth_(req,false),prefix=validMonth_(req);return[...new Set(openSlotsFor_(slotCompanyFilter_(a)).filter(s=>s.available&&s.date.startsWith(prefix)).map(s=>s.date))].sort()}
function getAvailableSlots_(req){const a=auth_(req,false),date=validDate_(normalizeDate_(req.date));return openSlotsFor_(slotCompanyFilter_(a)).filter(s=>s.date===date)}
function getCalendarMonth_(req){const a=auth_(req,false),prefix=validMonth_(req);return openSlotsFor_(slotCompanyFilter_(a)).filter(s=>s.date.startsWith(prefix))}
function getCalendarAll_(req){const a=auth_(req,false);return openSlotsFor_(slotCompanyFilter_(a))}
function createReservation_(req){const a=auth_(req,false),slotId=String(req.slotId||'');if(!slotId)throw new AppError('예약 시간을 선택해 주세요.');const lock=LockService.getScriptLock();try{lock.waitLock(10000)}catch(e){throw new AppError('예약 요청이 많습니다. 잠시 후 다시 시도해 주세요.')}try{const slot=rows_(CONFIG.SHEETS.SLOTS).find(s=>s.slotId===slotId);if(!slot||!bool_(slot.enabled))throw new AppError('예약할 수 없는 시간입니다.');const date=validDate_(normalizeDate_(slot.date)),start=validTime_(normalizeTime_(slot.startTime)),end=validTime_(normalizeTime_(slot.endTime)),location=String(slot.location||'').trim();if(!isBookableDate_(date)||!scheduleLocations_(date).includes(location))throw new AppError('예약할 수 없는 날짜입니다.');if(!a.isMaster&&locationCompany_(location)!==a.user.company)throw new AppError(`${location}은(는) ${locationCompany_(location)} 소속만 예약할 수 있습니다.`);if(start>=end)throw new AppError('예약 시간 설정이 올바르지 않습니다.');if(isPast_(date,start))throw new AppError('이미 지난 시간은 예약할 수 없습니다.');const reservations=rows_(CONFIG.SHEETS.RESERVATIONS);if(reservations.some(r=>r.status==='ACTIVE'&&r.userId===a.user.userId))throw new AppError('예약은 1인당 1개만 가능합니다. 기존 예약을 취소한 후 다시 예약해 주세요.');if(reservations.some(r=>r.status==='ACTIVE'&&slotKey_(normalizeDate_(r.date),normalizeTime_(r.startTime),normalizeTime_(r.endTime),r.location)===slotKey_(date,start,end,location)))throw new AppError('방금 다른 사용자가 예약한 시간입니다. 다른 시간을 선택해 주세요.');const reservationId=uuid_();sheet_(CONFIG.SHEETS.RESERVATIONS).appendRow([reservationId,date,start,end,a.user.userId,a.user.company,a.user.name,a.user.departmentId,'ACTIVE',new Date(),location]);return{reservationId}}finally{lock.releaseLock()}}
function getMyReservations_(req){const a=auth_(req,false);return rows_(CONFIG.SHEETS.RESERVATIONS).filter(r=>r.userId===a.user.userId).map(r=>({...r,date:normalizeDate_(r.date),startTime:normalizeTime_(r.startTime),endTime:normalizeTime_(r.endTime),isPast:isPast_(normalizeDate_(r.date),normalizeTime_(r.endTime))})).sort((x,y)=>`${y.date} ${y.startTime}`.localeCompare(`${x.date} ${x.startTime}`))}
function cancelReservation_(req){const a=auth_(req,false),r=rows_(CONFIG.SHEETS.RESERVATIONS).find(x=>x.reservationId===String(req.reservationId||''));if(!r||r.userId!==a.user.userId)throw new AppError('예약 정보를 찾을 수 없습니다.');if(r.status!=='ACTIVE')throw new AppError('이미 취소된 예약입니다.');sheet_(CONFIG.SHEETS.RESERVATIONS).getRange(r._row,9).setValue('CANCELLED');return{reservationId:r.reservationId}}

function getUsers_(req){auth_(req,true);const dm=departmentMap_();return rows_(CONFIG.SHEETS.USERS).map(r=>({userId:r.userId,company:r.company,name:r.name,departmentId:r.departmentId,departmentName:dm[r.departmentId]?.departmentName||'',enabled:bool_(r.enabled)}))}
function saveUser_(req){auth_(req,true);const x=req.user||{},id=String(x.userId||uuid_()),company=requiredText_(x.company,'회사명'),name=requiredText_(x.name,'이름'),dept=String(x.departmentId||'');if(!departmentMap_()[dept])throw new AppError('존재하지 않는 부서입니다.');upsert_(CONFIG.SHEETS.USERS,'userId',id,[id,company,dept,name,!!x.enabled]);return{userId:id}}
function getDepartments_(req){auth_(req,true);return rows_(CONFIG.SHEETS.DEPARTMENTS).map(r=>({departmentId:r.departmentId,company:r.company,departmentName:r.departmentName,enabled:bool_(r.enabled)}))}
function saveDepartment_(req){auth_(req,true);const x=req.department||{},id=String(x.departmentId||uuid_()),company=requiredText_(x.company,'회사명'),name=requiredText_(x.departmentName,'부서명');upsert_(CONFIG.SHEETS.DEPARTMENTS,'departmentId',id,[id,company,name,!!x.enabled]);return{departmentId:id}}
function getAvailability_(req){auth_(req,true);const from=req.from?validDate_(req.from):'0000-01-01',to=req.to?validDate_(req.to):'9999-12-31';return rows_(CONFIG.SHEETS.SLOTS).map(r=>({...r,date:normalizeDate_(r.date),startTime:normalizeTime_(r.startTime),endTime:normalizeTime_(r.endTime),enabled:bool_(r.enabled)})).filter(r=>r.date>=from&&r.date<=to).sort((a,b)=>`${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))}
function saveAvailability_(req){auth_(req,true);const x=req.availability||{},date=validDate_(normalizeDate_(x.date)),start=validTime_(normalizeTime_(x.startTime)),end=validTime_(normalizeTime_(x.endTime)),locations=scheduleLocations_(date),location=String(x.location||(locations.length===1?locations[0]:'')).trim();if(!isBookableDate_(date))throw new AppError('사업장 일정이 없는 날짜에는 일정을 등록할 수 없습니다.');if(!locations.includes(location))throw new AppError(`해당 날짜의 장소는 ${locations.join(', ')} 중 하나로 입력해 주세요.`);if(start>=end)throw new AppError('종료 시간은 시작 시간보다 늦어야 합니다.');const id=x.slotId||uuid_();upsert_(CONFIG.SHEETS.SLOTS,'slotId',id,[id,date,start,end,!!x.enabled,location]);return{slotId:id}}
function getAllReservations_(req){auth_(req,true);const dm=departmentMap_();return rows_(CONFIG.SHEETS.RESERVATIONS).map(r=>({...r,date:normalizeDate_(r.date),startTime:normalizeTime_(r.startTime),endTime:normalizeTime_(r.endTime),departmentName:dm[r.departmentId]?.departmentName||''})).sort((a,b)=>`${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))}
function cancelReservationByMaster_(req){auth_(req,true);const r=rows_(CONFIG.SHEETS.RESERVATIONS).find(x=>x.reservationId===String(req.reservationId||''));if(!r)throw new AppError('예약 정보를 찾을 수 없습니다.');if(r.status!=='ACTIVE')throw new AppError('이미 취소된 예약입니다.');sheet_(CONFIG.SHEETS.RESERVATIONS).getRange(r._row,9).setValue('CANCELLED');return{reservationId:r.reservationId}}
function upsert_(sheetName,keyName,keyValue,values){const sh=sheet_(sheetName),existing=rows_(sheetName).find(r=>r[keyName]===keyValue);if(existing)sh.getRange(existing._row,1,1,values.length).setValues([values]);else sh.appendRow(values)}

/** 최초 1회 실행: 시스템 시트와 헤더를 생성합니다. */
function setupSheets(){const ss=ss_();Object.keys(HEADERS).forEach(name=>{let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);sh.setFrozenRows(1);sh.getRange(1,1,1,HEADERS[name].length).setFontWeight('bold').setBackground('#15365b').setFontColor('#ffffff');sh.autoResizeColumns(1,HEADERS[name].length)})}

/**
 * 명단.xlsx의 '사용자명단', '예약가능날짜' 시트를 같은 Spreadsheet로 가져온 뒤 1회 실행하세요.
 * Users, Departments, AvailableSlots, Reservations, Masters의 기존 내용은 초기화됩니다.
 */
function resetSystemFromImportedSheets(){
  const ss=ss_(),roster=ss.getSheetByName('사용자명단'),schedule=ss.getSheetByName('예약가능날짜');
  if(!roster||!schedule)throw new Error("'사용자명단'과 '예약가능날짜' 시트를 먼저 가져와 주세요.");
  setupSheets();
  const people=roster.getRange(2,1,Math.max(roster.getLastRow()-1,0),3).getDisplayValues().map(r=>({company:r[0].trim(),department:r[1].trim(),name:r[2].trim()})).filter(x=>x.company&&x.department&&x.name);
  if(!people.some(x=>x.company==='티에스이'&&x.name==='조다은'))people.push({company:'티에스이',department:'인사총무',name:'조다은'});
  const deptRows=[],deptIds={};
  people.forEach(x=>{const key=`${x.company}|${x.department}`;if(!deptIds[key]){deptIds[key]=uuid_();deptRows.push([deptIds[key],x.company,x.department,true])}});
  const userRows=people.map(x=>[uuid_(),x.company,deptIds[`${x.company}|${x.department}`],x.name,true]);
  const dates=Object.keys(CONFIG.SCHEDULE).filter(isBookableDate_);
  const timeRows=schedule.getRange(2,7,Math.max(schedule.getLastRow()-1,0),1).getDisplayValues().flat().map(String).map(x=>x.match(/(\d{1,2}:\d{2})\s*[~～-]\s*(\d{1,2}:\d{2})/)).filter(Boolean).map(m=>[normalizeTime_(m[1]),normalizeTime_(m[2])]);
  const slotRows=scheduleSlotRows_(timeRows);
  const data={Departments:deptRows,Users:userRows,AvailableSlots:slotRows,Reservations:[],Masters:[['티에스이','인사총무','조다은',true]]};
  Object.keys(data).forEach(name=>{const sh=sheet_(name),headers=HEADERS[name];sh.clearContents();sh.getRange(1,1,1,headers.length).setValues([headers]);if(data[name].length)sh.getRange(2,1,data[name].length,headers.length).setValues(data[name]);sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#15365b').setFontColor('#ffffff');sh.autoResizeColumns(1,headers.length)});
  return{users:userRows.length,departments:deptRows.length,dates:dates.length,slots:slotRows.length};
}

function scheduleSlotRows_(timeRows){const rows=[];Object.keys(CONFIG.SCHEDULE).filter(isBookableDate_).sort().forEach(date=>scheduleLocations_(date).forEach(location=>timeRows.forEach(([start,end])=>rows.push([uuid_(),date,start,end,true,location]))));return rows}

/**
 * CONFIG.SCHEDULE 변경 후 1회 실행: AvailableSlots만 날짜×사업장×시간으로 다시 만듭니다.
 * 사용자·예약 내역은 유지되며, 시간대는 기존 AvailableSlots의 시간 조합을 그대로 사용합니다.
 */
function rebuildSlotsFromSchedule(){
  const seen={},timeRows=[];
  rows_(CONFIG.SHEETS.SLOTS).forEach(s=>{const start=normalizeTime_(s.startTime),end=normalizeTime_(s.endTime),key=`${start}|${end}`;if(!seen[key]&&/^\d{2}:\d{2}$/.test(start)&&/^\d{2}:\d{2}$/.test(end)){seen[key]=true;timeRows.push([start,end])}});
  if(!timeRows.length)throw new Error('기존 AvailableSlots에서 시간대를 찾지 못했습니다.');
  timeRows.sort((x,y)=>x[0].localeCompare(y[0]));
  const sh=sheet_(CONFIG.SHEETS.SLOTS),headers=HEADERS.AvailableSlots,slotRows=scheduleSlotRows_(timeRows);
  sh.clearContents();sh.getRange(1,1,1,headers.length).setValues([headers]);if(slotRows.length)sh.getRange(2,1,slotRows.length,headers.length).setValues(slotRows);sh.autoResizeColumns(1,headers.length);
  return{times:timeRows.length,slots:slotRows.length};
}
