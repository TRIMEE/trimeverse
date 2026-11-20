// Preserve links shared before Trimeverse became a multipage site.
const legacy={gravity:'gravity.html',compact:'compact-objects.html',nuclear:'nuclear-reactions.html',waves:'wave-interference.html',pendulum:'pendulum-worlds.html'};
if(document.body.dataset.page==='home'){const hash=location.hash.slice(1);const target=legacy[hash.replace(/^lab-/, '')]||(hash==='laboratory'?'simulations.html':hash==='field-guide'?'learn.html':hash==='stargazing'?'observe.html':null);if(target)location.replace('/'+target);}
