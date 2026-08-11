(function(){
"use strict";
if(document.querySelector('script[data-ip-multipage-loader="1"]'))return;
const s=document.createElement('script');
s.src='assets/js/multipage-plan.js?v=20260811-2255';
s.defer=true;
s.dataset.ipMultipageLoader='1';
document.head.appendChild(s);
})();