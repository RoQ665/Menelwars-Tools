(function(root){
  'use strict';
  const routes={
    liga:{view:'league-view',module:'gang'},
    wplaty:{view:'payments-view',module:'gang'},
    spolka:{view:'company-view',module:'gang'},
    operacje:{view:'special-operations-view',module:'gang'},
    ankiety:{view:'polls-view',module:'gang'},
    cele:{view:'goals-view',module:'gang'},
    ogloszenia:{view:'announcements-view',module:'gang'},
    potrzeby:{view:'demand-view',module:'gang'},
    gang:{view:'gang-menu-view',module:'gang'},
    ogrod:{view:'garden-view',module:'garden'},
    destylarnia:{view:'optimizer-view',module:'distillery'},
    nieodkryte:{view:'unknown-view',module:'distillery'},
    'dodaj-recepte':{view:'submit-view',module:'distillery'},
    postep:{view:'progress-view',module:'distillery'},
    pvp:{view:'builds-view',module:'builds'},
    mapa:{view:'map-view',module:'map'},
    konto:{view:'account-view',module:'account'},
    start:{view:'home-view',module:''}
  };
  function create(options){
    const {location,history,open,authorize,onLoginRequired,onError}=options;
    let applying=false,pending='',lastHandled='',scheduled=false;
    const slug=()=>String(location.hash||'').replace(/^#/,'');
    async function apply(){
      const name=slug(),route=routes[name];
      if(!route)return;
      if(applying){lastHandled='';return;}
      applying=true;lastHandled=location.href;pending='';
      try{
        const allowed=await authorize(route);
        if(slug()!==name)return;
        if(!allowed){pending=name;await onLoginRequired(route);return;}
        await open(route);
      }catch(error){await onError(error);}
      finally{applying=false;if(slug()!==name&&routes[slug()])void apply();}
    }
    function showView(view){
      if(applying)return;
      // The login form must not replace the requested destination in the URL.
      if(pending&&view==='account-view')return;
      const entry=Object.entries(routes).find(([,route])=>route.view===view);
      if(!entry)return;
      pending='';
      const hash='#'+entry[0];
      if(location.hash!==hash)history.pushState(null,'',location.pathname+location.search+hash);
      lastHandled=location.href;
    }
    function changed(){
      if(scheduled)return;scheduled=true;
      Promise.resolve().then(()=>{scheduled=false;if(location.href!==lastHandled)void apply();});
    }
    return {showView,start:apply,changed,resume:async()=>{if(pending&&slug()===pending)await apply();}};
  }
  const api={routes,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.ToolRoutes=api;
})(typeof window!=='undefined'?window:globalThis);
