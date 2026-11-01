(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenGrowth=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function predict(gardenData,candidate){
 const GARDEN_AUTO_MODEL_VERSION='AUTO52',GARDEN_AUTO_MODEL_HOURS=52;
  function gardenEventsFor(experimentId) {
    return (gardenData.phases || [])
      .filter(event=>String(event.experimentId)===String(experimentId))
      .slice()
      .sort((a,b)=>(Number(a.observedAt)||0)-(Number(b.observedAt)||0) || String(a.eventId||"").localeCompare(String(b.eventId||"")));
  }

  function gardenPhaseSummary(experiment) {
    if (!experiment || !experiment.id) {
      return {events:[],analysisEvents:[],frames:[],checks:[],lastFrame:null,ready:null};
    }

    // Historia pozostaje append-only. Korekta nie usuwa starego wiersza z OgrodFazy,
    // ale w analizie wykluczamy raport wskazany przez CorrectionOfEventID. Dzięki temu
    // błędne 7 skorygowane później na 6 nie wygląda jak biologiczne cofnięcie 7→6.
    const events=gardenEventsFor(experiment.id);
    const correctedIds=new Set(
      events
        .map(event=>String(event.correctionOfEventId||"").trim())
        .filter(Boolean)
    );
    const analysisEvents=events.filter(
      event=>!correctedIds.has(String(event.eventId||"").trim())
    );

    const frames=analysisEvents.filter(
      event=>event.eventType==="FRAME" && Number.isInteger(Number(event.atlasFrame))
    );
    const checks=analysisEvents.filter(
      event=>event.eventType==="CHECK" &&
        Number.isInteger(Number(event.expectedFrame)) &&
        (event.answer==="YES" || event.answer==="NO")
    );
    const readyEvents=analysisEvents.filter(event=>event.eventType==="READY");
    const ready=readyEvents.length?readyEvents[0]:null;
    const lastFrame=frames.length?frames[frames.length-1]:null;
    let entryLower=Number(experiment.startedAt)||0;
    let entryUpper=lastFrame?Number(lastFrame.observedAt)||0:0;

    if (lastFrame) {
      let firstIndex=frames.length-1;
      while (firstIndex>0 && Number(frames[firstIndex-1].atlasFrame)===Number(lastFrame.atlasFrame)) firstIndex--;
      const firstCurrent=frames[firstIndex];
      entryUpper=Number(firstCurrent.observedAt)||entryUpper;
      const allBefore=analysisEvents.filter(
        event=>(Number(event.observedAt)||0)<entryUpper && event.eventType==="FRAME"
      );
      if (allBefore.length) entryLower=Number(allBefore[allBefore.length-1].observedAt)||entryLower;
    }

    return {events,analysisEvents,frames,checks,lastFrame,ready,entryLower,entryUpper};
  }

  function gardenUsesAutoModel(item) {
    return String(item && item.modelVersion || "").toUpperCase() === GARDEN_AUTO_MODEL_VERSION;
  }

  function gardenMedian(values) {
    const sorted = (values || [])
      .map(Number)
      .filter(Number.isFinite)
      .sort((a,b)=>a-b);
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length/2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid-1]+sorted[mid])/2;
  }

  function gardenCheckStats(item,summary) {
    const checks=(summary && summary.checks || []).slice().sort((a,b)=>Number(a.observedAt)-Number(b.observedAt));
    const yes=checks.filter(event=>event.answer==="YES");
    const no=checks.filter(event=>event.answer==="NO");
    const gaps=checks.slice(1).map((event,index)=>Math.max(0,Number(event.observedAt)-Number(checks[index].observedAt)));
    const last=checks.length ? checks[checks.length-1] : null;
    const lastNonReadyYes=yes.filter(event=>Number(event.expectedFrame)<9).slice(-1)[0] || null;
    return {
      checks,yes,no,last,lastNonReadyYes,
      medianGap:gardenMedian(gaps),
      maxGap:gaps.length ? Math.max(...gaps) : 0,
      agreement:checks.length ? yes.length/checks.length : null
    };
  }

  function gardenEvidenceForResult(item) {
    const summary=gardenPhaseSummary(item);
    const stats=gardenCheckStats(item,summary);
    const duration=Math.max(0,Number(item && item.durationMs) || 0);
    const forecastDuration=Math.max(0,Number(item&&item.estimatedReadyAt||0)-Number(item&&item.startedAt||0)) || GARDEN_AUTO_MODEL_HOURS*60*60*1000;
    const lastNotReadyDuration=Number(item&&item.lastNotReadyAt)>Number(item&&item.startedAt)
      ? Number(item.lastNotReadyAt)-Number(item.startedAt)
      : 0;
    const hasNotReadyProof=lastNotReadyDuration>0 && (!Number(item.finishedAt)||Number(item.lastNotReadyAt)<=Number(item.finishedAt));
    const harvestedByForecast=duration>0 && duration<=forecastDuration;
    const provenByDeadline=harvestedByForecast||hasNotReadyProof;
    const modelMismatch=stats.no.length>0;
    const lateWithoutProof=duration>forecastDuration&&!hasNotReadyProof;
    const lateMismatch=lateWithoutProof&&modelMismatch;
    const finalGap=stats.last
      ? Math.max(0,Number(item.finishedAt||0)-Number(stats.last.observedAt||0))
      : 0;
    let confidence="niska";
    if (stats.checks.length>=3 && stats.last && finalGap<=6*60*60*1000) confidence="wysoka";
    else if (stats.checks.length>=1) confidence="średnia";
    return {summary,stats,duration,forecastDuration,lastNotReadyDuration,hasNotReadyProof,harvestedByForecast,lateWithoutProof,provenByDeadline,modelMismatch,lateMismatch,finalGap,confidence};
  }

  function gardenObservedDuration(item) {
    const summary=gardenPhaseSummary(item);
    if (summary.ready && Number(summary.ready.observedAt)>Number(item.startedAt)) {
      return {duration:Number(summary.ready.observedAt)-Number(item.startedAt),source:"READY"};
    }
    if (Number(item.durationMs)>0) return {duration:Number(item.durationMs),source:"HARVEST"};
    return null;
  }

  function gardenStageObservation(item,evidence) {
    const startedAt=Number(item&&item.startedAt)||0;
    if (!startedAt) return null;
    const rows=(evidence?.stats?.checks||[]).map(event=>{
      const frame=event.answer==="NO"&&Number.isInteger(Number(event.atlasFrame))
        ? Number(event.atlasFrame)
        : Number(event.expectedFrame);
      const age=Number(event.observedAt)-startedAt;
      if (!Number.isInteger(frame)||frame<0||frame>8||age<=0) return null;
      const duration=Math.max(24*60*60*1000,Math.min(96*60*60*1000,age*10/(frame+0.5)));
      // Późniejsze obrazy zawężają czas mocniej. Wybrany przy odpowiedzi „Nie”
      // rzeczywisty obraz jest nieco silniejszym dowodem niż zwykłe „Tak”.
      const weight=(0.08+0.22*(frame/8))*(event.answer==="NO"&&Number.isInteger(Number(event.atlasFrame))?1:0.72);
      return {duration,weight};
    }).filter(Boolean);
    if (!rows.length) return null;
    const total=rows.reduce((sum,row)=>sum+row.weight,0);
    return {
      duration:rows.reduce((sum,row)=>sum+row.duration*row.weight,0)/total,
      weight:Math.min(0.48,total),
      source:"STAGES"
    };
  }

  function gardenObservationForModel(item) {
    if (gardenUsesAutoModel(item)) {
      const evidence=gardenEvidenceForResult(item);
      if (!evidence.duration) return null;
      const reportWeight=Math.min(0.28,evidence.stats.checks.length*0.08);
      const agreementWeight=evidence.stats.agreement==null
        ? 0
        : Math.max(-0.16,Math.min(0.16,(evidence.stats.agreement-0.5)*0.32));
      const stage=gardenStageObservation(item,evidence);
      let harvest=null;

      if (evidence.hasNotReadyProof) {
        // Wiemy jedynie, że dojrzenie nastąpiło po ostatnim sprawdzeniu i nie
        // później niż zbiór. Środek przedziału jest neutralnym oszacowaniem,
        // a szeroki przedział automatycznie obniża wagę wyniku.
        const lower=Math.min(evidence.lastNotReadyDuration,evidence.duration);
        const gap=Math.max(0,evidence.duration-lower);
        harvest={
          duration:lower+gap/2,
          source:"NOT_READY_TO_HARVEST",
          weight:Math.max(0.18,Math.min(0.82,0.72/(1+gap/(6*60*60*1000))+reportWeight+agreementWeight))
        };
      } else if (evidence.harvestedByForecast) {
        // Zbiór przed prognozą dowodzi, że roślina była gotowa najpóźniej w
        // tej chwili. Może bezpiecznie skracać model, lecz ma mniejszą wagę
        // niż przedział oparty na świadomym sprawdzeniu.
        harvest={
          duration:evidence.duration,
          source:"EARLY_HARVEST",
          weight:Math.max(0.25,Math.min(0.78,0.5+reportWeight+agreementWeight))
        };
      }

      // Późny odbiór bez „Sprawdzono — nadal rośnie” nie może wydłużać
      // prognozy. Odpowiedzi etapów pozostają jednak niezależnym dowodem.
      if (!harvest) return stage ? {...stage,evidence} : null;
      if (!stage) return {...harvest,evidence};
      const combinedWeight=harvest.weight+stage.weight;
      return {
        duration:(harvest.duration*harvest.weight+stage.duration*stage.weight)/combinedWeight,
        source:`${harvest.source}_AND_STAGES`,
        weight:Math.min(1,combinedWeight),
        evidence
      };
    }

    const observed=gardenObservedDuration(item);
    if (!observed || !Number.isFinite(observed.duration) || observed.duration<=0) return null;

    // Starsze pomiary ręczne zachowują wcześniejsze zasady, aby nie usuwać
    // historycznych danych z okresu przed automatycznym modelem.
    // Obie wartości nadal są górnym ograniczeniem rzeczywistego momentu
    // dojrzenia, a nie „prawdą co do sekundy”.
    const startWeight=String(item.startSource||"LIVE").toUpperCase()==="MANUAL" ? 0.65 : 1;
    const endWeight=observed.source==="READY" ? 1 : 0.78;
    return {
      duration:observed.duration,
      source:observed.source,
      weight:startWeight*endWeight
    };
  }

  function gardenResearchDistance(a,b) {
    if (!a || !b) return Infinity;
    const ds=(Number(a.sun)-Number(b.sun))/25;
    const dw=(Number(a.water)-Number(b.water))/25;
    const dp=(Number(a.ph)-Number(b.ph))/2;
    return Math.sqrt(ds*ds+dw*dw+dp*dp);
  }

  function gardenKernelPrediction(candidate) {
    const rows=(gardenData.results||[])
      .filter(item=>item&&item.plant===candidate.plant)
      .map(item=>({item,obs:gardenObservationForModel(item)}))
      .filter(row=>row.obs);
    if (rows.length<3) return null;

    const bandwidth=0.9;
    const weighted=[];
    rows.forEach(row=>{
      const distance=gardenResearchDistance(candidate,row.item);
      const kernel=Math.exp(-0.5*(distance/bandwidth)*(distance/bandwidth));
      const weight=kernel*row.obs.weight;
      if (weight>0.015) weighted.push({
        duration:row.obs.duration,
        weight,
        distance,
        source:row.obs.source
      });
    });
    if (weighted.length<3) return null;

    const sw=weighted.reduce((sum,row)=>sum+row.weight,0);
    const sw2=weighted.reduce((sum,row)=>sum+row.weight*row.weight,0);
    const effectiveN=sw2>0 ? (sw*sw)/sw2 : 0;
    if (sw<=0 || effectiveN<2.2) return null;

    const basePredictedMs=weighted.reduce((sum,row)=>sum+row.weight*row.duration,0)/sw;
    const lowerBounds=[...(gardenData.results||[]),...(gardenData.active||[])]
      .filter(item=>item&&item.plant===candidate.plant&&Number(item.lastNotReadyAt)>Number(item.startedAt))
      .map(item=>{
        const distance=gardenResearchDistance(candidate,item);
        const kernel=Math.exp(-0.5*Math.pow(distance/bandwidth,2));
        return {duration:Number(item.lastNotReadyAt)-Number(item.startedAt),weight:kernel,distance};
      })
      .filter(row=>row.weight>0.015&&row.duration>basePredictedMs);
    const lowerBoundWeight=lowerBounds.reduce((sum,row)=>sum+row.weight,0);
    const lowerBoundTarget=lowerBoundWeight>0
      ? lowerBounds.reduce((sum,row)=>sum+row.weight*row.duration,0)/lowerBoundWeight
      : basePredictedMs;
    // „Jeszcze nie wyrosła” jest obserwacją jednostronną: znamy minimum,
    // ale nie dokładny moment dojrzenia. Przesuwamy model w stronę tej granicy,
    // bez traktowania kliknięcia jak czasu zbioru.
    const lowerBoundStrength=Math.min(0.75,lowerBoundWeight/(1+lowerBoundWeight));
    const predictedMs=basePredictedMs+Math.max(0,lowerBoundTarget-basePredictedMs)*lowerBoundStrength;
    const variance=weighted.reduce((sum,row)=>sum+row.weight*Math.pow(row.duration-basePredictedMs,2),0)/sw;
    const nearest=Math.min(...weighted.map(row=>row.distance));
    const unresolvedLowerBoundGap=lowerBounds.length?Math.max(...lowerBounds.map(row=>Math.max(0,row.duration-predictedMs)*row.weight)):0;
    const uncertaintyMs=Math.sqrt(Math.max(0,variance)) + predictedMs*(0.06/Math.sqrt(Math.max(1,effectiveN))) + predictedMs*Math.min(0.25,nearest*0.08) + unresolvedLowerBoundGap*0.5;
    const readySupport=weighted.filter(row=>row.source==="READY").length;

    let confidence="niska";
    if (effectiveN>=6 && nearest<=0.55 && uncertaintyMs/predictedMs<=0.18) confidence="wysoka";
    else if (effectiveN>=3.5 && nearest<=0.9 && uncertaintyMs/predictedMs<=0.30) confidence="średnia";

    return {
      predictedMs,
      uncertaintyMs,
      confidence,
      effectiveN,
      support:weighted.length,
      readySupport,
      lowerBoundSupport:lowerBounds.length,
      nearest
    };
  }

 return gardenKernelPrediction(candidate);
 }
 function estimate(data,candidate){const prediction=predict(data,candidate);return {durationMs:Math.max(24*3600000,Math.min(96*3600000,Math.round(prediction?.predictedMs||52*3600000))),source:prediction?'model':'fallback52',confidence:prediction?.confidence||'brak danych'};}
 return {predict,estimate};
});
