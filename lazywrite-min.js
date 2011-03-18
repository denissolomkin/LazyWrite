/*
 * LazyWrite - deferred document.write implementation
 * Version: 1.0 beta build 20110318
 * Website: http://github.com/xfsn/LazyWrite
 * 
 * Copyright (c) 2011 Shen Junru
 * Released under the MIT License.
 */
(function(w,y,o,g){var E=1,z=y?"onreadystatechange":"onload",k=/^\s*<!--/,l=w.write,x=w.writeln,b=w.createDocumentFragment(),t=w.createElement("div"),A=g,s=g,h=g,i=g,e=[],f=[],r=false,c=true,j=[].join,F=function(I,H){return I.appendChild(H)},p=function(H){return H.parentNode?H.parentNode.removeChild(H):H},a=function(I,H){return I.parentNode.replaceChild(H,I)&&H},v=function(){return w.createElement("span")},D=function m(I){var H=w.createElement("script");H.type=I.type;if(I.src){H.src=I.src}else{H.text=I.text}return H},C=function(I,H){if(H.src){H[z]=function(){var K=y&&H.readyState;if(!H.done&&(!K||/complete|loaded/.test(K))){if(K==="loaded"&&!H.loaded){H.loaded=true;setTimeout(arguments.callee)}else{H.done=true;H[z]=null;p(I);if(s===H){s=g;d()}}}};s=H;setTimeout(function(){F(I,H)})}else{try{o(H.text.replace(k,""))}catch(J){}p(I)}},u=function(H){if(H){if(!s){A=H.holder}C(H.holder,H.script=D(H.script));return !H.script.src}},B=function(H){while((H=u(f.shift()))){}return H!==false&&!s},q=function(K,L,J){if(y){t.innerHTML="<img />"+L;p(t.firstChild)}else{t.innerHTML=L}var I=[],H=t.getElementsByTagName("script");while(H[0]){I.push({script:H[0],holder:a(H[0],element=v())})}f=I.concat(f);while(t.firstChild){b.appendChild(t.firstChild)}if(h===K){i.parentNode.insertBefore(b,i)}else{i=b.appendChild(i||v());J?K.parentNode.insertBefore(b,K.nextSibling):a(K,b)}h=K;if(I.length){c=B()}return c},G=function(H){return H&&H.html&&q(w.getElementById(H.id),H.html)},n=function(H){while(G(e.shift())){}if(c&&!e.length){i&&p(i);b=t=A=s=h=i=g;w.write=l;w.writeln=x}},d=function(){c=true;if(B()){n()}};w.writeln=w.write=function(){var J,I=j.call(arguments,"");if(I){if(r){try{q(A,I,true)}catch(H){}}else{e.push({id:J="document_write_"+E++,html:I});J='<span id="'+J+'"></span>';l.call?l.call(w,J):l(J)}}};window.LazyWrite={write:l.apply?function(){l.apply(w,arguments)}:l,render:function(H,I){H&&I&&e.push({id:H,html:I})},start:function(){if(r){return}r=true;n()}}})(document,/*@cc_on!@*/!1,function(){eval.apply(window,arguments)});
