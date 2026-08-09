import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key, {
  auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true },
}) : null;

export async function checkSupabaseAuthService(timeoutMs=5000){
  if(!supabaseConfigured||!url||!key)return false;
  const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetch(`${url.replace(/\/$/,'')}/auth/v1/settings`,{headers:{apikey:key},signal:controller.signal,credentials:'omit'});return response.status<500;}catch{return false;}finally{window.clearTimeout(timeout);}
}

export async function checkSupabaseDatabaseService(timeoutMs=5000){
  if(!supabaseConfigured||!url||!key)return false;
  const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),timeoutMs);
  try{
    // Connectivity means the Supabase REST/database gateway is reachable. A
    // 401/403 can still be a healthy database with a restricted anonymous role.
    const response=await fetch(`${url.replace(/\/$/,'')}/rest/v1/`,{method:'GET',headers:{apikey:key,Accept:'application/openapi+json'},signal:controller.signal,credentials:'omit'});
    return response.status<500;
  }catch{return false;}finally{window.clearTimeout(timeout);}
}

export async function getCurrentProfile(){
  if(!supabase)return{user:null,profile:null,error:new Error('Supabase is not configured')};
  const{data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)return{user:null,profile:null,error:userError??null};
  const{data:profile,error}=await supabase.from('profiles').select('*').eq('id',user.id).single();
  return{user,profile,error};
}
