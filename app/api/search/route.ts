import { NextRequest } from 'next/server';
import { store } from '../../../lib/server/live-store';
import { currentUser, failure, json } from '../../../lib/server/http';
import { searchWorkspace } from '../../../lib/server/search';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:NextRequest){
  try{
    currentUser(request);
    const query=request.nextUrl.searchParams.get('q')||'';
    return json({query,results:searchWorkspace(store().db,query)});
  }catch(error){return failure(error);}
}
