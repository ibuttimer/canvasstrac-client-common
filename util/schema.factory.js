/*jslint node: true */
'use strict';

angular.module('ct.clientCommon')

  .constant('SCHEMA_CONST', (function () {
    var SORT_ASC = '+',
      SORT_DESC = '-',

      BASIC_SORT_OPTIONS = [],
      SORT_DIRS = [
        {key: SORT_ASC, chr: '\u25B2'},
        {key: SORT_DESC, chr: '\u25BC'}
      ];

    // generate basic sort options list
    [{name: 'Index', key: 'index'}].forEach(function (option) {
      SORT_DIRS.forEach(function (sort) {
        BASIC_SORT_OPTIONS.push({
          name: option.name + ' ' + sort.chr,
          value: sort.key + option.key
          // no id field as the compare function can be directly returned
        });
      });
    });

    return {
      // schema field properties
      DIALOG_PROP: 'dialog',    // property for string used in dialogs
      DISPLAY_PROP: 'display',  // property for display string
      MODEL_PROP: 'model',      // property for field(s) used in db model
      ID_PROP: 'id',            // property for id used to identify schema
      
      // sort direction indicators
      SORT_ASC: '+',
      SORT_DESC: '-',
      SORT_DIRS: SORT_DIRS,
      
      BASIC_SORT_OPTIONS: BASIC_SORT_OPTIONS
    };
  })())

/* A schema object provider, with help from https://www.bennadel.com/blog/2788-creating-a-factory-provider-for-the-configuration-phase-in-angularjs.htm
  NOTE: The provider can have other providers injected, but it cannot inject 
	services as this will be created during the configuration phase, before 
	services have been made available.

  NOTE: The ProvideSchema() function is going to be instantiated using the
	"new" operator; as such, we could use the "this" reference to define object
	properties and methods. But this implementation retruns a public API.
*/
  .provider('schema', ['$injector', 'SCHEMA_CONST', function ProvideSchema($injector, SCHEMA_CONST) {

    // Return the public API for the provider.
    return({
      getSchema: getSchema,
      makeSortList: makeSortList,

      // The provider must include a $get() method that will be our 
      // factory function for creating the service. This $get() method 
      // will be invoked using $injector.invoke() and can therefore use
      // dependency-injection.
      $get: instantiateProvider
    });


    /**
     * Create a Schema obkect
     * @returns {object} new Schema object
     */
    function getSchema() {
      return $injector.instantiate(Schema);
    }

    /**
     * Generate a sort option list based on the specified schema object
     * @param   {object} schema  Schema to generate sort list from
     * @param   {Array}  indices Schema field indices to use
     * @param   {string} idTag   Schema id string
     * @returns {Array}  List of sort options
     */
    function makeSortList (schema, indices, idTag) {

      var sortOptions = angular.copy(SCHEMA_CONST.BASIC_SORT_OPTIONS);

      // add addr sort option to basic list of sort options
      indices.forEach(function (index) {
        var field = schema.getField(index);
        SCHEMA_CONST.SORT_DIRS.forEach(function (sort) {
          sortOptions.push({
            name: field.display + ' ' + sort.chr,
            value: sort.key + field.dialog,
            id: idTag + index
          });
        });
      });

      return sortOptions;
    }


    // ---
    // FACTORY METHOD.
    // ---


    // Create the actual schema service. 
    // --
    // NOTE: This function is the same function we could have defined if we
    // had just used .factory() instead of .provider(). As such, this method
    // is invoked using dependency injection and can inject other services.
    function instantiateProvider() {

      // Return the public API.
      return({
        dummy: dummy
      });

      // ---
      // PUBLIC METHODS.
      // ---

      // Return a greeting message for the given name.
      function dummy() {
        return 'Placeholder provider method';
      }

    }

  }])

//  .config(function configureApplication (schemaProvider) {
//    // You can configure the provider during the config stage, via public API for the provider.
//    // --
//    // NOTE: After the configuration phase is over, there will be no public
//    // way to change this unless you cache a reference to the provider.
//    schemaProvider.someConfigFunction(<<config>>);
//  })
//
//  .run(function startApplication (schema ) {
//      // Consume the schema that we configured in the previous Config phase.
//      console.log( schema.greet( "Kim" ) );
//    }
//  )

;


function Schema () {
  this.fields = [];
  
  /**
   * Add a new entry to the Schema
   * @param   {string} dialog  String used in dialogs
   * @param   {string} display String displayed in dialogs
   * @param   {Array|object}  model   Field(s) from dm model
   * @param   {string}  id      Schema id 
   * @returns {number} index of added entry
   */
  this.addField = function (dialog, display, model, id) {
    var array;
    if (!Array.isArray(model)) {
      array = [model];
    } else {
      array = model;
    }
    this.fields.push({
      dialog: dialog,
      display: display,
      model: array,
      id: id
    });
    return (this.fields.length - 1);
  };
  
  /**
   * Return the schema field with the specified index. If 
   * @param   {number} index    Index of field to return
   * @param   {string} property Property of field to return
   * @returns {object} Field object or property
   */
  this.getField = function (index, property) {
    var result;
    if ((index >= 0) && (index < this.fields.length)) {
      if (typeof property === 'string') {
        // return specific property of entry
        result = this.fields[index][property];
      } else {
        // return whole entry
        result = this.fields[index];
      }
    }
    return result;
  };

  /**
   * Callback the specified function for each field in the schema, providing the field details as the callback arguments
   * @param {function} callback Function to callback
   */
  this.forEachField = function (callback) {
    if (typeof callback === 'function') {
      for (var i = 0; i < this.fields.length; ++i) {
        callback(i, this.fields[i].dialog, 
                 this.fields[i].display, 
                 this.fields[i].model, 
                 this.fields[i].id);
      }
    }
  };

  
}

  
  

