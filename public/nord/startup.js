/* Visible recovery when a dependency fails; never reads or resets trip data. */
(()=>{'use strict';
let ready=false;
function fail(){if(ready)return;const notice=document.querySelector('#app-load-error');if(notice)notice.hidden=false;}
const timer=setTimeout(fail,10000);
window.NordBoot={fail,ready(){ready=true;clearTimeout(timer);const notice=document.querySelector('#app-load-error');if(notice)notice.hidden=true;}};
document.addEventListener('DOMContentLoaded',()=>{if(!ready)fail();});
})();
