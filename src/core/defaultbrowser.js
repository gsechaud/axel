/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin, Jonathan Wafellman 
 * 
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  xtdom, xtiger.cross, xtiger.util modules                                   |
|                                                                             |
|  Low level utility functions                                                |
|                                                                             |
|*****************************************************************************|
|  Some of these functions are browser dependent in which case this file      |
|  defines the non IE version, see iebrowser.js for the IE version            |
|                                                                             |
|  See also dom.js                                                            |
|                                                                             |
\*****************************************************************************/

// user agent detection
xtiger.cross.UA = {
  IE:   !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  opera:  navigator.userAgent.indexOf('Opera') > -1,
  webKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  gecko:  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
  mobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)  
};

xtiger.cross.events = {
  DOWN: (window.Modernizr && window.Modernizr.touch) ? 'touchstart' : 'mousedown'
};

if (! (xtiger.cross.UA.gecko || xtiger.cross.UA.webKit || xtiger.cross.UA.IE || xtiger.cross.UA.opera ||  xtiger.cross.UA.mobileSafari)) {
  xtiger.cross.log ('warning', 'XTiger Forms could not detect user agent name, assuming a Gecko like browser');
  xtiger.cross.UA.gecko = true;
}

xtiger.util.countProperties = function (o) {
  var total = 0, k;
  for (k in o) if (o.hasOwnProperty(k))  total++;
  return total;
}

// Encode XML entities
// Note: there is no need to decode them since they will be decoded when parsed by the browser per-XML spec
xtiger.util.encodeEntities = function (s) {
  if (typeof(s) != "string") { // FIXME: isn't it too costly here ?
    // maybe it's a number
    return s; 
  }
  var res = s;
  if (s.indexOf('&') != -1) {
    res = res.replace(/&(?![a-zA-Z]{3,5};)/g, '&amp;'); // Avoid double encoding
  }
  if (s.indexOf('<') != -1) {        
    res = res.replace(/</g, '&lt;');  
  } 
  if (s.indexOf('>') != -1) {        
    res = res.replace(/>/g, '&gt;');  
  } 
  return res;
}

/**
 * Parses the "param" attribute of &lt;xt:use&gt; elements. It stores the
 * parsing results in the provided hash.
 * 
 * @param {string}
 *            aString The string content of the "param" attribute
 * @param {object}
 *            aParams A hash where to store the parsed results
 */
xtiger.util.decodeParameters = function (aString, aParams) {
  if (!aString)
    return;
  var _tokens = aString.split(';');
  for (var _i = 0; _i < _tokens.length; _i++) {
    var pos =  _tokens[_i].indexOf('=');
    if (pos > 0) {
      var _parsedTok = _tokens[_i].substr(0, pos);
      var _key = _parsedTok.replace(/^\s+/, '').replace(/\s+$/, ''); // Trim    
      if (_key.length > 0) {
        if (_key == 'class') { // pb with 'class' key in js on Safari
          _key = 'hasClass';
        }
        aParams[_key] = _tokens[_i].substr(pos + 1).replace(/^\s+/, '').replace(/\s+$/, '');        
        }
      } // FIXME: raise a warning (?)
  }
}

/**
 * Implements the "map" feature for arrays.
 * 
 * This function does not affect the given array. It returns a freshly created one.
 */
xtiger.util.array_map = function array_map (aArray, aCallback) {
  if (! (typeof aArray == 'object' && typeof aCallback == 'function'))
    return aArray;
  var _buf = [];
  for (var _i = 0; _i < aArray.length; _i++) {
    _buf[_i] = aCallback(aArray[_i]);
  }
  return _buf;
}

// Returns a localized string using AXEL locales conventions
xtiger.util.getLocaleString = function getLocaleString (key, values) {
  var locale = xtiger.defaults.locale || 'en',
      res;
  if (xtiger.defaults.locales && xtiger.defaults.locales[locale]) {
    res = xtiger.defaults.locales[locale][key];
  }
  if (res === undefined) {
    if ((locale !== 'en') && xtiger.defaults.locales && xtiger.defaults.locales.en) { // fallbacks to 'en'
      res = xtiger.defaults.locales.en[key];
    } else {
      res = 'missing key: ' + key;
    }
  }
  return (typeof res === "function") ? res(values) : res;
}

//////////////////
// xtiger.cross //
//////////////////

/**
 * Returns an XMLHTTPRequest object depending on the platform.
 * Returns false and displays an alert if it fails to create one 
 */
xtiger.cross.getXHRObject = function () {
  var xhr = false;  
  if (window.XMLHttpRequest) {
     xhr = new XMLHttpRequest();
  } else if (window.ActiveXObject) {  // IE
    try {
      xhr = new ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {
      try {   
        xhr = new ActiveXObject('Microsoft.XMLHTTP');  
      } catch (e) {
      }
    }
  }
  if (! xhr) {
     alert("Your browser does not support XMLHTTPRequest");
  }
  return xhr;       
}                  
          
/**
 * Loads the document at URL using the default XHR object created by the getXHRObject method
 * Accepts an optional logger (xtiger.util.Logger) object to report errors
 * Returns the document (should be a DOM Document object) or false in case of error
 */
xtiger.cross.loadDocument = function (url, logger) {
  var xhr = xtiger.cross.getXHRObject ();
  try {  
    xhr.open("GET", url, false); // false:synchronous
    xhr.send(null);
    if ((xhr.status  == 200) || (xhr.status  == 0)) { // 0 is for loading from local file system
      if (xhr.responseXML) {
        return xhr.responseXML;     
        // FIXME: on FF we must test for parseerror root and first child text node err msg !!!!
      } else if (logger) {
        logger.logLocaleError('errNoXML', { url : url });
      }
    } else if (logger) { 
      logger.logLocaleError('errLoadDocumentStatus', { url : url, xhr: xhr });
    }
  } catch (e) {
    if (logger) {
      logger.logLocaleError('errException', { url : url, e : e });
    }
  }
  return false;
}

/**
 * Logs its arguments separated by a space.
 */
xtiger.cross.log = function  (channel, msg) {
  switch (channel) {
  case 'error' :
  case 'fatal' :
    xtiger.cross.print('[XX] ' + msg);
    break;
  case 'warning' :
    xtiger.cross.print('[!!] ' + msg);
    break;
  case 'info' :
    //xtiger.cross.print('[ii] ' + msg);
    break;
  case 'debug' :
    xtiger.cross.print('[dd] ' + msg);
    break;
  case 'stack-trace' :
    xtiger.cross.print('[tt] ' + msg);
    break;
  default :
    //xtiger.cross.print('[' + channel + '] ' + msg);
  }
}

/**
 * Prints an output on the browser's console, if any
 */
xtiger.cross.print = function (aMessage) {
  try {
    if (typeof(opera) != 'undefined' && opera.log) {
      opera.postError(aMessage);
    }
    else if (typeof(console) != 'undefined') {
      if (/^\[!!\]/.test(aMessage) && console.warn)
        console.warn(aMessage);
      else if (/^\[XX\]/.test(aMessage) && console.error)
        console.error(aMessage);
      else if (console.log)
        console.log(aMessage);
    }
    else if (typeof(window.console) != 'undefined' && window.console.log) {
      window.console.log (aMessage);
    }
    /*else
      alert(aMessage);*/ // Only if debugging
  } catch (_err) {
    alert(aMessage + "\nUnable to print on console (" + _err.message + ")"); 
  }
}

/**
 * Factory function that creates a minimal DOMParser object for parsing XML string
 * into DOM objects (to be used as data sources).
 * @function xtiger.cross.makeDOMParser
 */
// DOMParser is currently used only to load data in a data source from a String
if (typeof DOMParser == "undefined") {
  
  xtiger.util.DOMParser = function () {};
  
  xtiger.util.DOMParser.prototype.parseFromString = function (str, contentType) {
    if (typeof ActiveXObject != "undefined") {
      var d = new ActiveXObject("MSXML.DomDocument");
      d.loadXML(str);
      return d;
    } else if (typeof XMLHttpRequest != "undefined") {
      // FIXME: with FF 3.0.5 this raises an exception (access to restricted URI)
      // because data: URI scheme is considered as a cross browser attempt to read a file
      var req = new XMLHttpRequest;
      req.open("GET", "data:" + (contentType || "application/xml") +
                      ";charset=utf-8," + encodeURIComponent(str), false);
      if (req.overrideMimeType) {
         req.overrideMimeType(contentType);
      }
      req.send(null);
      return req.responseXML;
    }
  }       
  xtiger.cross.makeDOMParser = function () {
    return new xtiger.util.DOMParser();
  }     
  
} else {
  xtiger.cross.makeDOMParser = function () {
    return new DOMParser();
  }
}

/**
 * Factory function that creates and returns a new TreeWalker object.
 * @function xtiger.cross.makeTreeWalker
 */
if (! document.createTreeWalker) {  
// if (true) {  
  xtiger.util.TreeWalker =
    function (node, nodeType, filter){
      this.nodeList = new Array();
      this.nodeType = nodeType;
      this.filter = filter;
      this.nodeIndex = -1;
      this.currentNode = null;      
      this.findNodes(node);
    }   
    
  xtiger.util.TreeWalker.prototype = {
    nextNode:function(){
      this.nodeIndex += 1;
      if(this.nodeIndex < this.nodeList.length){
        this.currentNode = this.nodeList[this.nodeIndex];
        return true;
      }else{
        this.nodeIndex = -1;
        return false;
      }
    },
    
    findNodes:function(node){
      if( node.nodeType == this.nodeType && this.filter(node)== xtdom.NodeFilter.FILTER_ACCEPT ){
        this.nodeList.push(node);
      }
      if(node.nodeType == 1 ){
        for(var i = 0; i<node.childNodes.length; i++){
          this.findNodes(node.childNodes[i]);
        }
      }
    }
  }
  
  xtiger.cross.makeTreeWalker =
    function (n, type, filter) { return new xtiger.util.TreeWalker(n, type, filter) }
} else {
  xtiger.cross.makeTreeWalker =
    function (n, type, filter) { filter.acceptNode = filter; return n.ownerDocument.createTreeWalker(n, type, filter, false) }
  // see http://stackoverflow.com/questions/5982648/recommendations-for-working-around-ie9-treewalker-filter-bug
}  

/**
 * Returns the XTiger type of a DOM node. Returns xtiger.UNKNOWN otherwise.
 * Pre-condition: the node must be an Element node.
 * FIXME: do browser dependent version trully using namespace DOM API to void setting prefixes in marble  
 */
xtdom.getNodeTypeXT = function (aNode) {
  // FIXME: depends on namespace prefix on FF 
  var s = aNode.nodeName.toLowerCase(); // localName not defined for IE
  if ((s == 'use') || (s == 'xt:use')) {
    return xtiger.USE;
  } else if ((s == 'component') || (s == 'xt:component')) {
    return xtiger.COMPONENT;
  } else if ((s == 'repeat') || (s == 'xt:repeat')) {
    return xtiger.REPEAT;
  } else if ((s == 'bag') || (s == 'xt:bag')) {
    return xtiger.BAG;
  } else if ((s == 'attribute') || (s == 'xt:attribute')) {
    return xtiger.ATTRIBUTE;
  // } else if ((s == 'menu-marker') || (s == 'xt:menu-marker')) { {
  //  return xtiger.MENU_MARKER;
  } else {
    return xtiger.UNKNOWN;
  }
}

/////////////////////
// A few constants //
/////////////////////

xtdom.ELEMENT_NODE = 1;
xtdom.ATTRIBUTE_NODE = 2;
xtdom.TEXT_NODE = 3;
xtdom.CDATA_SECTION_NODE = 4;
xtdom.COMMENT_NODE = 8

if ((typeof NodeFilter == "undefined") || !NodeFilter) {
  xtdom.NodeFilter = {
    SHOW_ELEMENT : 1,
    FILTER_ACCEPT : 1,
    FILTER_SKIP : 3 
  } 
} else {
  xtdom.NodeFilter = {
    SHOW_ELEMENT : NodeFilter.SHOW_ELEMENT,
    FILTER_ACCEPT : NodeFilter.FILTER_ACCEPT,
    FILTER_SKIP : NodeFilter.FILTER_SKIP
  }
}

/**
 * Returns the DOM window object for a given document. if the document is within
 * an iframe, returns the frame's window object.
 * 
 * @param aDocument
 * @return
 */
xtdom.getWindow = function getWindow (aDocument) {
  if (window.document == aDocument)
    return window;
  if (window.frames.length > 0) {
    for (var _i = 0; _i < window.frames.length; _i++) {
      if (window.frames[_i].document == aDocument)
        return window.frames[_i];
    }
  }
  xtiger.cross.log('warning', 'The window object was not found.');
  return window;
}

// No-IE browser methods
if (! xtiger.cross.UA.IE) {

  // Returns true if the node is an XTiger node
  xtdom.isXT = function isXT (node) {
    var ns = node.namespaceURI;
    return (ns == xtiger.parser.nsXTiger) || (ns == xtiger.parser.nsXTiger_deprecated);
  } 
  
  // Returns true if the DOM is a xt:use node, false otherwise.
  xtdom.isUseXT = function isUseX (aNode) { 
    // FIXME: depends on namespace prefix on FF + should we lowercase nodeName ?
    return (aNode.nodeName == 'use' || aNode.nodeName == 'xt:use');
  }

  // Returns true if the DOM is a xt:bag node, false otherwise.
  xtdom.isBagXT = function (aNode) {  
    // FIXME: depends on namespace prefix on FF + should we lowercase nodeName ?
    return (aNode.nodeName == 'bag' || aNode.nodeName == 'xt:bag');
  }

  xtdom.getElementsByTagNameXT = function (container, name) { 
    // FIXME: depends on namespace prefix on FF   
    var res = container.getElementsByTagName(name);
    if (0 == res.length) {
      res = container.getElementsByTagName('xt:' + name);
    } 
    return res;
  }

  // Returns the local node of a node (without namespace prefix)
  xtdom.getLocalName = function (node) {
    return node.localName; // otherwise nodeName includes "prefix:"
  }
  
  xtdom.getTextContent = function (aNode) {
    if (aNode.textContent)
      return aNode.textContent;
    else if (aNode.text)
      return aNode.text;
    else
      return '';
  }
    
  xtdom.createElement = function (doc, tagName) {
    // there may be some issues with massive default attribute creation on IE ?
    //  return doc.createElement(tagName);
    return doc.createElementNS("http://www.w3.org/1999/xhtml", tagName);
  };

  xtdom.createElementNS = function (doc, tagName, ns) {
    return doc.createElementNS(ns, tagName);
  };
    
  xtdom.importNode = function (doc, node, deep) {
    return doc.importNode (node, deep);
  }
  
  xtdom.cloneNode = function (doc, node, deep) {
    // FIXME: shall we check if (node.ownerDocument == doc) to import the node instead of cloning
    return node.cloneNode (deep);
  } 
    
  xtdom.setAttribute = function(node, name ,value){
    node.setAttribute(name, value);
  }
  
  xtdom.getStyleAttribute = function (aNode) {
    return aNode.getAttribute('style');
  }
  
  xtdom.getEventTarget = function (ev) {
    return ev.target;
  } 

  xtdom.addEventListener = function (node, type, listener, useCapture){
    node.addEventListener(type, listener, useCapture);
  }

  xtdom.removeEventListener = function (node, type, listener, useCapture) {
    node.removeEventListener(type, listener, useCapture);
  } 

  xtdom.removeAllEvents = function (node) {
    alert ('removeAllEvents should not be called on this browser')
  }
  
  xtdom.preventDefault = function (aEvent) {
    aEvent.preventDefault();
  }
  
  xtdom.stopPropagation = function (aEvent) {
    aEvent.stopPropagation();
  }           
                         
  xtdom.focusAndSelect = function (aField) {
    try {
      aField.focus(); // not sure: for Safari focus must preceed select
      aField.select(); // variant: setSelectionRange(0, aField.value.length); 
    } // FIXME: iPad ?
    catch (e) {}
  }

  xtdom.focusAndMoveCaretTo = function (aField, aPos) {
    try {
      aField.focus();
      if (aField.setSelectionRange) {
        aField.setSelectionRange(aPos, aPos);
      }
    }
    catch (e) {}
  }

} // else REMEMBER TO INCLUDE iebrowser.js !

