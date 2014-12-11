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
 * Author(s) : Stephane Sire (Oppidoc)
 *
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'date' filter                                                         |
|                                                                             |
|  Replaces handle with a jQuery UI calendar field when editing               |
|                                                                             |
|*****************************************************************************|
|  Prerequisites : JQuery and JQuery UI datepicker                            |
|  Note : this filter cannot be chained with other filters                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

 // FIXME: move to bundles ?
 var REGION = {
     'fr': {
           closeText: 'Fermer',
           prevText: 'Précédent',
           nextText: 'Suivant',
           currentText: 'Aujourd\'hui',
           monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
           monthNamesShort: ['Janv.','Févr.','Mars','Avril','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
           dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
           dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
           dayNamesMin: ['D','L','M','M','J','V','S'],
           weekHeader: 'Sem.',
           dateFormat: 'dd/mm/yy',
           firstDay: 1,
           isRTL: false,
           showMonthAfterYear: false,
           yearSuffix: ''
         }
 };

 // converts a date string between two different formats
 // leave it unchanged in case of errot
 // FIXME: some formats such as RSS also requires to pass Day and Month name options !!!!
 var _convertDate = function ( editor, dateStr, inSpec, outSpec ) {
   var inFormat = editor.getParam(inSpec);
   var outFormat = editor.getParam(outSpec);
   if (inSpec === 'date_region') { // double indirection
     inFormat = REGION[inFormat] ? REGION[inFormat].dateFormat : $.datepicker.regional[''].dateFormat;
     outFormat = $.datepicker[outFormat] || outFormat;
   }
   if (outSpec === 'date_region') { // double indirection
     inFormat = $.datepicker[inFormat] || inFormat;
     outFormat = REGION[outFormat] ? REGION[outFormat].dateFormat : $.datepicker.regional[''].dateFormat;
   }
   var res = null;
   try {
     res = $.datepicker.formatDate(outFormat,$.datepicker.parseDate(inFormat, dateStr));
   }
   catch (e) {
     res = dateStr;
   }
   return res;
 };

 /*****************************************************************************\
 |                                                                             |
 | jQuery date picker device                                                   |
 |                                                                             |
 | FIXME:  - move to separate file                                             |
 \*****************************************************************************/
 var datepickerDevice = function ( doc ) {
   var _this = this;
   this.handle = xtdom.createElement(doc, 'input');
   xtdom.setAttribute(this.handle, 'size', 10);
   this.jhandle = $(this.handle);
   this.jhandle.datepicker().datepicker('option', 'onClose', function () { _this.onClose(); });
   this.myDoc = doc;
   this.cache = {};
 };

 datepickerDevice.prototype = {
   // Replaces the editor's handle with the date picker input
   // Somehow similar to PlacedField in text device
   // Replaces the handle with a hook that has the same root element as the handle
   // and that contains an input or textarea edit field
   // FIXME: register keyboard manager to track TAB navigation ?
   grab : function ( editor, doSelectAll ) {
     var tmp, _htag, region = editor.getParam('date_region');
     $.datepicker.setDefaults((region === 'fr') ? REGION['fr'] : $.datepicker.regional['']);
     this.jhandle.val(editor.getData()); // FIXME: format data to date (?)
     this.editorHandle = editor.getHandle();
     this.model = editor;
     _htag = xtdom.getLocalName(this.editorHandle);
     if (_htag.toLowerCase() === 'input') { // can't use input inside input...
      _htag = 'span';
     }
     if (! this.cache[_htag]) {
       this.hook = xtdom.createElement(this.myDoc, _htag);
       this.cache[_htag] = this.hook;
     } else {
       this.hook = this.cache[_htag];
     }
     // constraints
     tmp = editor.getParam('minDate');
     this.jhandle.datepicker('option', 'minDate', tmp || null);
     tmp = editor.getParam('maxDate');
     this.jhandle.datepicker('option', 'maxDate', tmp || null);
     tmp = editor.getParam('beforeShow');
     if (tmp) {
       this.jhandle.datepicker('option', 'beforeShow', tmp); // sets callback
     } else {
       this.jhandle.datepicker('option', 'beforeShow', tmp); // unsets callback
     }
     // insertion
     var parent = this.editorHandle.parentNode;
     if (this.hook.firstChild != this.handle) {
       this.hook.appendChild(this.handle);
     }
     parent.insertBefore (this.hook, this.editorHandle, true);
     parent.removeChild(this.editorHandle);
     if (doSelectAll) {
       xtdom.focusAndSelect(this.handle);
     } else {
       this.jhandle.datepicker('show');
     }
     this.closingInProgress = false;
   },
   release : function ( isCancel ) {
     var parent = this.hook.parentNode;
     parent.insertBefore (this.editorHandle, this.hook, true);
     parent.removeChild(this.hook);
     if (! isCancel) {
       this.model.update(this.jhandle.val()); // updates model with new value
     }
     if (! this.closingInProgress) { // external call (e.g. TAB navigation ?)
       this.closingInProgress = true;
       this.jhandle.datepicker('hide');
     }
   },
   onClose : function ( ) {
     if (! this.closingInProgress) {
       this.release();
     }
   }
 };

 xtiger.registry.registerFactory('datepickerdev',
   {
     getInstance : function (doc) {
       var cache = xtiger.session(doc).load('datepickerdev');
       if (! cache) {
         cache = new datepickerDevice(doc);
         xtiger.session(doc).save('datepickerdev', cache);
       }
       return cache;
     }
   }
 );

 var datepickerFilterMixin = {

    // Implements (default data | maxDate | minDate) = "today" feature
    // Note that because of a current AXEL API limitation it is not possible to directly change
    // the default data and/or parameters for the plugin (for instance inside onGenerate) because
    // the values read from the XTiger template are saved earlier to the shadow clone by repeat.js
    onAwake : function () {
      var tmp;
      if (this.getParam('maxDate') === 'today') {
        tmp = $.datepicker.formatDate('dd/mm/yy', new Date());
        this.configure('maxDate', tmp);
      };
      if (this.getParam('minDate') === 'today') {
        tmp = tmp || $.datepicker.formatDate('dd/mm/yy', new Date());
        this.configure('minDate', tmp);
      };
      if (this.getDefaultData() === 'today') {
        this._setData(tmp || $.datepicker.formatDate('dd/mm/yy', new Date()));
      };
      this.__date__onAwake();
    },

   onLoad : function (aPoint, aDataSrc) {
     this.__date__onLoad(aPoint, aDataSrc);
     // post-action : converts view data to date_region format
     this._setData(_convertDate(this, this.getData(), 'date_format', 'date_region'));
   },

   onSave : function (aLogger) {
     var tmp = this.getData();
     // pre-action : converts view data model to date_format
     this._data = _convertDate(this, tmp, 'date_region', 'date_format');
     this.__date__onSave(aLogger);
     this._data = tmp; // reestablish it for next save
   },

   methods : {

     startEditing : function ( aEvent ) {
       var _doSelect = !this.isModified() || (aEvent && aEvent.shiftKey);
       var picker = xtiger.factory('datepickerdev').getInstance(this.getDocument());
       picker.grab(this, _doSelect);
     },

     stopEditing : function ( isCancel ) {
       var picker = xtiger.factory('datepickerdev').getInstance(this.getDocument());
       picker.release(isCancel);
     },

     // Experimental method to change parameters - to be part of future Param API ?
     // FIXME: indirection for datepicker('option', key, value) ?
     configure : function (key, value) {
       if ((value === undefined) || (((key === 'minDate') || (key === 'maxDate')) && isNaN(new Date(value).getDay()))) {
         delete this._param[key];
       } else {
         this._param[key] = value;
         // FIXME: this.configure(key, value)
       }
     }
   }
 };

 $axel.filter.register(
    'date',
    { chain : [ 'onAwake', 'onLoad', 'onSave' ] },
    {
      date_region : 'fr',
      date_format : 'ISO_8601'
    },
    datepickerFilterMixin);
 $axel.filter.applyTo({ 'date' : 'text' });
 
 // FIXME: share functions with 'date' plugin (in axel-forms)
 xtiger.util.date = {
   convertDate : _convertDate,
   setRegion : function (country) { 
     $.datepicker.setDefaults((country === 'fr') ? REGION['fr'] : $.datepicker.regional['']);
    }
 };
}($axel));
