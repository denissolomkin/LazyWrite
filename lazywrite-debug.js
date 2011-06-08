/*!
 * LazyWrite - deferred document.write implementation
 * Version: 1.0 beta build 20110608
 * Website: http://github.com/xfsn/LazyWrite
 *
 * Copyright (c) 2011 Shen Junru
 * Released under the MIT License.
 */

(function(document, isIE, globalEval, undefined){

var
_index = 1,
_loadEvent  = isIE ? 'onreadystatechange' : 'onload',
_scriptFix  = /^\s*<!--/,
_lazyPrefix = 'lazy-holder-',
_lazyType   = 'text/lazyjs',

// original functions
_write   = document.write,
_writeln = document.writeln,
_origin  = _write.apply
    ? function(){ _write.apply(document, arguments); }
    : /* handle IE issue */ _write,

// render helper elements
_renderFragment = document.createDocumentFragment(),
_renderParser   = document.createElement('div'),
_scriptHolder   = undefined, // for multiple document.write in one inside script
_scriptBlocker  = undefined, // for external loading and stack executing
_previousHolder = undefined, // for same render holder checking
_parallelHolder = undefined, // for render in same render holder

// data storage
_writeStack  = [], // store the HTML that use document.write in the page
_scriptStack = [], // store the script and it's holder
_currntWrite = undefined, // current write item

// flags
_started   = false,
_continued = true,

// combine an array
_combine = [].join,

logger = function(message){
    console.log(message);
},

// error catcher
_error = function(ex){
    logger('Exception: ' + ex);
    _currntWrite.ex.push(ex);
},

// append the element to holder element
// return the appended element
_appendElement = function(holder, element){
    return holder.appendChild(element);
},

// remove the element from the document, if it in the document
// return the removed element
_removeElement = function(element){
    return element.parentNode ? element.parentNode.removeChild(element) : element;
},

// replace the element by the new element
// return the replace element
_replaceElement = function(element, other){
    logger('==REPLACE ELEMENT=================================');
    logger('original: ' + (element.id || element.nodeName));
    logger('original content: ' + element.innerHTML);
    logger('replace: ' + (other.id || other.nodeName));
    logger('replace content: ' + (other.innerHTML || other.src || other.text || ('[' + other.childNodes.length + ']')));
    return element.parentNode.replaceChild(other, element) && other;
},

// return a new holder element
_createHolder = function(prefix){
    var holder = document.createElement('span');
    holder.id = prefix + _index++;
    logger('create holder: <' + holder.id + '>');
    return holder;
},

// clone a script element for cross browser issue
// return the new script element
_cloneScript = function cloneScript(script){
    var result = document.createElement('script');
    result.type = script.type;
    if (script.src) result.src  = script.src;
    else result.text = script.text;
    return result;
},

// load script element
_loadScript = function(scriptHolder, script){
    if (script.src) {
        script[_loadEvent] = function(){
            logger('==SCRIPT EVENT====================================');
            logger('blocker: '    + (_scriptBlocker ? _scriptBlocker.src : 'none'));
            logger('load url: '   + script.src);
            logger('load state: ' + (script.readyState || '->onload'));
            logger('load flag: '  + script.loaded);
            logger('continue: '   + _continued);
            var state = isIE && script.readyState;
            if (!script.done && (!state || /complete|loaded/.test(state))) {
                // handle IE readyState issue, simulate the 'complete' readyState
                // waiting the load script be executed.
                if (state === 'loaded' && !script.loaded) {
                    script.loaded = true;
                    setTimeout(arguments.callee);
                } else {
                    script.done = true;
                    logger('script executed');

                    // handle memory leak in IE
                    // can't set as undefined
                    script[_loadEvent] = null;
                    // remove script holder, if it still in the document
                    _removeElement(scriptHolder);

                    if (_scriptBlocker === script) {
                        // release the script blocker
                        _scriptBlocker = undefined;
                        logger('unblock: ' + script.src);
                        // continue the stack executing
                        _continue();
                    }
                }
            }
        };

        // set the script blocker
        _scriptBlocker = script;
        logger('block: ' + script.src);

        // postpone load the script file
        setTimeout(function(){
            _appendElement(scriptHolder, script);
        });
    } else {
        // handle FF 3.6 script non-immediate-execute issue
        // use eval instead insert script element to document
        try {
            // handle IE eval() SyntaxError.
            globalEval(script.text.replace(_scriptFix, ''));
        } catch (ex) {
            _error(ex);
        }

        // remove script holder, if it still in the document
        _removeElement(scriptHolder);
    }
},

// execute one item of scripts stack
// return continue flag
_executeScript = function(renderHolder, item){
    if (item) {
        logger('==EXECUTE SCRIPT==================================');
        logger('render holder: ' + (renderHolder ? renderHolder.id : 'none'));
        logger('script holder: ' + (item ? item.holder.id : 'none'));
        logger('blocker: '    + (_scriptBlocker ? _scriptBlocker.src : 'none'));
        logger('content: ' + (item ? item.script.src || item.script.text : 'none'));
        // set the script holder as the render holder for inside 'document.write'.
        if (!_scriptBlocker) _scriptHolder = item.holder;

        // load / execute script
        _loadScript(item.holder, item.script = _cloneScript(item.script));

        // return continue flag
        return !item.script.src;
    }
},

// execute the global scripts stack
// return continue flag
_executeScripts = function(renderHolder, flag/* this isn't a parameter */){
    while ((flag = _executeScript(renderHolder, _scriptStack.shift())));
    return flag !== false && !_scriptBlocker;
},

// render one document.write stuff
// return continue flag
_renderHTML = function(renderHolder, html, inside){
    logger('==RENDER HTML====================================');
    logger('render holder: ' + renderHolder.id);
    logger('previous holder: ' + (_previousHolder ? _previousHolder.id : 'none'));
    logger('render holder parent: ' + (renderHolder.parentNode ? renderHolder.parentNode.id : 'none'));
    logger('previous holder parent: ' + (_previousHolder && _previousHolder.parentNode ? _previousHolder.parentNode.id : 'none'));
    logger('html: ' + html);

    // convert HTML
    if (isIE) {
        // handle IE innerHTML issue
        _renderParser.innerHTML = '<img />' + html;
        _removeElement(_renderParser.firstChild);
    } else {
        _renderParser.innerHTML = html;
    }

    var stack = [], // store the the scripts and their holders over this rendering.
        scripts = _renderParser.getElementsByTagName('script');

    // replace script elements by script holders
    while (scripts[0]) {
        stack.push({
            script: scripts[0],
            holder: _replaceElement(scripts[0], element = _createHolder('script_holder_'))
        });
    }
    // put the stack at the top of the global script stack.
    _scriptStack = stack.concat(_scriptStack);

    // convert to DocumentFragment
    while (_renderParser.firstChild) {
        _renderFragment.appendChild(_renderParser.firstChild);
    }

    // render in the document
    if (_previousHolder === renderHolder) {
        // insert before the parallel holder
        _parallelHolder.parentNode.insertBefore(_renderFragment, _parallelHolder);
    } else {
        // append the parallel holder
        _parallelHolder = _renderFragment.appendChild(_parallelHolder || _createHolder('parallel_holder_'));

        // replace holder in the document
        inside
            // handle IE6 subsequent replaceChild() issue in Windows XP
            ? renderHolder.parentNode.insertBefore(_renderFragment, renderHolder.nextSibling)
            :_replaceElement(renderHolder, _renderFragment);
    }

    // store current render holder as previous holder
    _previousHolder = renderHolder;

    // execute scripts and return continue flag
    if (stack.length) _continued = _executeScripts(renderHolder);
    _continued ? logger('<< RENDER CONTINUING <<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
               : logger('<< RENDER STOPING <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');

    // return continue flag
    return _continued;
},

// render one item of the global write stack
// return continue flag
_renderWrite = function(item){
    logger('##################################################');
    return item && item.html && _renderHTML(document.getElementById(item.id), item.html);
},

// render the global write stack
_renderStack = function(){
    while(_renderWrite(_currntWrite = _writeStack.shift()));
    logger('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
    if (_continued && !_writeStack.length) {
        logger('>> END OF LAZY WRITE <<');
        // remove parallel holder, if it exists
        _parallelHolder && _removeElement(_parallelHolder);

        // destroy objects
        _renderFragment
            = _renderParser
            = _scriptHolder
            = _scriptBlocker
            = _previousHolder
            = _parallelHolder
            = undefined;

        // restore original functions
//        document.write = _write;
//        document.writeln = _writeln;
        document.write = document.writeln = function(){
            alert(_combine.call(arguments, ''));
        };
    }
},

// continue the rest stack (script and write)
_continue = function(){
    logger('>> continue() <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    _continued = true;
    if (_executeScripts()) {
        try {
            // execute callback function
            _currntWrite.cb && _currntWrite.cb(_currntWrite);
        } catch (ex) {
            _error(ex);
        }

        _renderStack();
    }
},

// add content to write stack
_addContent = function(content, holder, callback){
    if (typeof callback !== 'function') callback = undefined;
    if (typeof holder   === 'function') callback = holder, holder = undefined;

    // write a place holder in the document
    holder || _origin('<span id="' + (holder = _lazyPrefix + _index++) + '"></span>');

    // add to write stack
    _writeStack.push({ id: holder, html: content, cb: callback, ex: [] });
},

// lazy write function
_lazyEngine = function(){
    var html = _combine.call(arguments, '');
    logger('==DOCUMENT.WRITE==================================');
    logger('started: ' + _started);
    logger('script holder: ' + (_scriptHolder ? _scriptHolder.id : 'none'));
    logger('html: ' + html);
    if (html) if (_started) {
        // render HTML directly
        try {
            _renderHTML(_scriptHolder, html, true);
        } catch (ex) {
            _error(ex);
        }
    } else _addContent(html);
};

(window.LazyWrite = {
    /**
     * original document.write function
     * @param {String} content content to write into document
     */ 
    write: _origin,

    /**
     * add content to later render
     * @param {String} content content to later render
     * @param {String|Function} holder [optional] place holder id or callback function
     * @param {Function} callback [optional] callback function
     */ 
    render: _addContent,

    /**
     * replace original document.write functions by lazy engine
     */ 
    prepare: function(){
        document.writeln = document.write = _lazyEngine;
    },

    /**
     * start to process the contents
     */
    process: function(){
        if (_started) return;
        _started = true;
        _renderStack();
    },

    /**
     * process all custom typed script elements
     * @param {String} type 
     */
    findScripts: function(type){
        type = type || _lazyType;

        var holder, require, i = 0,
        scripts = [].slice.call(document.querySelectorAll
            ? document.querySelectorAll('script[type="' + type + '"]')
            : document.getElementsByTagName('script'));

        for (; i < scripts.length; i++) if (type === scripts[i].type) {
            _replaceElement(scripts[i], holder = _createHolder());
            if (require = scripts[i].getAttribute('require')) {
                _appendElement(_renderParser, document.createElement('script')).src = require;
            }
            _appendElement(_renderParser, scripts[i]);
            _addContent(_renderParser.innerHTML, holder.id = _lazyPrefix + _index++);
            _renderParser.innerHTML = '';
        }
    }
}).prepare();

})(document, /*@cc_on!@*/!1, function(){
    eval.apply(window, arguments);
});

if (!window.console) console = {};
if (!console.log) console.log = window.opera ? opera.postError : function(){};
console.clear && console.clear();