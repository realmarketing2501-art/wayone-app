const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let _accessToken: string | null = localStorage.getItem('wayone_token');
let _refreshToken: string | null = localStorage.getItem('wayone_refresh');

function setTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
  localStorage.setItem('wayone_token', access);
  localStorage.setItem('wayone_refresh', refresh);
}
function clearTokens() {
  _accessToken = null; _refreshToken = null;
  localStorage.removeItem('wayone_token'); localStorage.removeItem('wayone_refresh');
}
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers: Record<string,string> = {'Content-Type':'application/json', ...(options.headers as Record<string,string> || {})};
  if (_accessToken) headers.Authorization = `Bearer ${_accessToken}`;
  let res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (res.status === 401 && _refreshToken) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refreshToken:_refreshToken })});
    if (refreshRes.ok) {
      const data = await refreshRes.json(); setTokens(data.accessToken, data.refreshToken); headers.Authorization = `Bearer ${data.accessToken}`;
      res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    } else clearTokens();
  }
  return res;
}
async function get<T>(url: string): Promise<T> { const res = await fetchWithAuth(url); if (!res.ok) throw new Error((await res.json()).error || 'Errore di rete'); return res.json(); }
async function post<T>(url: string, body: unknown): Promise<T> { const res = await fetchWithAuth(url, { method:'POST', body: JSON.stringify(body) }); if (!res.ok) throw new Error((await res.json()).error || 'Errore di rete'); return res.json(); }
async function put<T>(url: string, body: unknown): Promise<T> { const res = await fetchWithAuth(url, { method:'PUT', body: JSON.stringify(body) }); if (!res.ok) throw new Error((await res.json()).error || 'Errore di rete'); return res.json(); }

export async function registerUser(email:string,password:string,name:string,referralCode?:string){ try{ const data=await post<{user:Record<string,unknown>;accessToken:string;refreshToken:string}>('/auth/register',{email,password,fullName:name,referralCode}); setTokens(data.accessToken,data.refreshToken); return {success:true,userId:data.user.id as string}; }catch(e){ return {success:false,error:(e as Error).message}; } }
export async function loginUser(email:string,password:string){ try{ const data=await post<{user:Record<string,unknown>;accessToken:string;refreshToken:string}>('/auth/login',{email,password}); setTokens(data.accessToken,data.refreshToken); return {success:true,user:data.user}; }catch(e){ return {success:false,error:(e as Error).message}; } }
export async function logoutUser(){ clearTokens(); }

export async function getUser(userId:string){ try{return await get<Record<string,unknown>>(`/users/${userId}`);}catch{return null;} }
export async function updateUser(userId:string, fields:Record<string,unknown>){ return put(`/users/${userId}`, fields); }
export async function getUserStats(userId:string){ try{return await get<Record<string,number>>(`/users/${userId}/stats`);}catch{return { activeInvestments:0, activeInvestmentVolume:0, activeInvestmentEarned:0, confirmedDeposits:0, confirmedDepositVolume:0, completedWithdrawals:0, completedWithdrawalVolume:0, positiveIncome:0 }; } }
export async function getAllUsers(limit=50, offset=0, search='', levelFilter='', statusFilter=''){ const params=new URLSearchParams({limit:String(limit), offset:String(offset)}); if(search) params.set('search',search); if(levelFilter) params.set('level',levelFilter); if(statusFilter) params.set('status',statusFilter); return get<{users:Record<string,unknown>[]; total:number}>(`/admin/users?${params}`); }

export async function getInvestmentPlans(){ try{ return await get<Record<string,unknown>[]>(`/invest/plans`);}catch{return [];} }
export async function createInvestment(_userId:string, planId:string, amount:number){ try{ await post(`/invest`,{planId,amount}); return {success:true}; }catch(e){ return {success:false,error:(e as Error).message}; } }
export async function getUserInvestments(userId:string){ try{return await get<Record<string,unknown>[]>(`/invest/${userId}`);}catch{return [];} }

export async function createDeposit(userId:string, amount:number, network:string, txHash:string){ try{ const data=await post<{depositId:string}>(`/deposits`,{userId,amount,network,txHash}); return {success:true,depositId:data.depositId}; }catch(e){ return {success:false,error:(e as Error).message}; } }
export async function getUserDeposits(userId:string){ try{return await get<Record<string,unknown>[]>(`/deposits/user/${userId}`);}catch{return [];} }
export async function getAllDeposits(status=''){ try{return await get<Record<string,unknown>[]>(`/admin/deposits${status?`?status=${status}`:''}`);}catch{return [];} }
export async function approveDeposit(depositId:string){ return post(`/admin/deposits/${depositId}/approve`,{}); }
export async function rejectDeposit(depositId:string){ return post(`/admin/deposits/${depositId}/reject`,{}); }

export async function createWithdrawal(userId:string, amount:number, network:string, walletAddress:string, speed:string){ try{ await post(`/withdrawals`,{userId,amount,network,walletAddress,speed}); return {success:true}; }catch(e){ return {success:false,error:(e as Error).message}; } }
export async function getUserWithdrawals(userId:string){ try{return await get<Record<string,unknown>[]>(`/withdrawals/user/${userId}`);}catch{return [];} }
export async function getAllWithdrawals(status=''){ try{return await get<Record<string,unknown>[]>(`/admin/withdrawals${status?`?status=${status}`:''}`);}catch{return [];} }
export async function approveWithdrawal(withdrawalId:string, txHash:string){ return post(`/admin/withdrawals/${withdrawalId}/approve`,{txHash}); }
export async function rejectWithdrawal(withdrawalId:string, reason:string){ return post(`/admin/withdrawals/${withdrawalId}/reject`,{reason}); }

export async function getNetworkTree(userId:string){ try{return await get<Record<string,unknown>[]>(`/network/tree/${userId}`);}catch{return [];} }
export async function getNetworkStats(userId:string){ try{return await get<{totalMembers:number; directReferrals:number; totalVolume:number; levelDistribution:Record<string,number>}>(`/network/stats/${userId}`);}catch{return {totalMembers:0,directReferrals:0,totalVolume:0,levelDistribution:{}};} }
export async function getUserReferralCode(userId:string){ const user=await getUser(userId); return (user?.referral_code as string) || ''; }

export async function getUserIncome(userId:string, limit=50){ try{return await get<Record<string,unknown>[]>(`/income/history/${userId}?limit=${limit}`);}catch{return [];} }
export async function getUserIncomeStats(userId:string){ try{return await get<{total:number; interest:number; team:number; bonus:number; daily:{date:string;amount:number}[]}>(`/income/stats/${userId}`);}catch{return {total:0,interest:0,team:0,bonus:0,daily:[]};} }

export async function getAvailableTasks(){ try{return await get<Record<string,unknown>[]>(`/tasks`);}catch{return [];} }
export async function getUserTaskProgress(userId:string){ try{return await get<Record<string,unknown>[]>(`/tasks/progress/${userId}`);}catch{return [];} }
export async function completeTask(userId:string, taskId:string){ try{ const data=await post<{reward:number}>(`/tasks/${taskId}/claim`,{userId}); return {success:true,reward:data.reward}; }catch{return {success:false}; } }

export async function getAvailableFunds(){ try{return await get<Record<string,unknown>[]>(`/funds`);}catch{return [];} }
export async function investInFund(userId:string, fundId:string, amount:number){ try{ await post(`/funds/${fundId}/invest`,{userId,amount}); return {success:true}; }catch(e){ return {success:false,error:(e as Error).message}; } }

export async function createPopupNotification(data:any){ return post<{id:string}>(`/admin/popups`,data); }
export async function getActivePopups(userLevel=''){ try{return await get<Record<string,unknown>[]>(`/users/popups${userLevel?`?level=${userLevel}`:''}`);}catch{return [];} }
export async function getAllPopups(){ try{return await get<Record<string,unknown>[]>(`/admin/popups`);}catch{return [];} }
export async function updatePopupStatus(popupId:string,status:string){ return put(`/admin/popups/${popupId}`,{status}); }
export async function deletePopup(popupId:string){ return fetchWithAuth(`/admin/popups/${popupId}`,{method:'DELETE'}); }
export async function createNotification(title:string,message:string,type='info',target='all',targetLevel=''){ return post(`/admin/notifications`,{title,message,type,target,targetLevel}); }
export async function getUserNotifications(limit=20){ try{return await get<Record<string,unknown>[]>(`/users/notifications?limit=${limit}`);}catch{return [];} }

export async function getSettings(){ try{return await get<Record<string,string>>(`/admin/settings`);}catch{return {}; } }
export async function updateSetting(key:string,value:string){ return put(`/admin/settings`,{key,value}); }
export async function getAdminDashboardStats(){ try{return await get<Record<string,unknown>>(`/admin/dashboard`);}catch{return {}; } }
export async function getAdminLevels(){ try{return await get<Record<string,unknown>[]>(`/admin/levels`);}catch{return []; } }
export async function createAdminLevel(payload:Record<string,unknown>){ return post(`/admin/levels`,payload); }
export async function updateAdminLevel(code:string,payload:Record<string,unknown>){ return put(`/admin/levels/${code}`,payload); }
export async function getAdminInvestmentPlans(){ try{return await get<Record<string,unknown>[]>(`/admin/investment-plans`);}catch{return []; } }
export async function createAdminInvestmentPlan(payload:Record<string,unknown>){ return post(`/admin/investment-plans`,payload); }
export async function updateAdminInvestmentPlan(id:string,payload:Record<string,unknown>){ return put(`/admin/investment-plans/${id}`,payload); }
export async function getPublicAppConfig(){ try{return await get<{levels:Record<string,unknown>[]; plans:Record<string,unknown>[]; faqs:Record<string,unknown>[]; branding:Record<string,string>}>(`/public/app-config`);}catch{return {levels:[],plans:[],faqs:[],branding:{}};} }

export async function initializeDb(){ return !!_accessToken; }
export function getSavedUserId(){ return localStorage.getItem('wayone_user_id'); }
export function saveUserId(id:string){ localStorage.setItem('wayone_user_id',id); }
export function clearSession(){ clearTokens(); localStorage.removeItem('wayone_user_id'); }
