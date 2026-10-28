importScripts('market-economy.js?v=24.48');
self.onmessage=e=>{try{const {recipes,items,owned,budget,maxRuns}=e.data;self.postMessage({ok:true,result:MarketEconomy.plan(recipes,items,owned,budget,maxRuns)});}catch(error){self.postMessage({ok:false,error:error.message});}};
