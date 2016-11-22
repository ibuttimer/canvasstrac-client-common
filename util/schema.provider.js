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
    function getSchema(name, modelProps) {
      return $injector.instantiate(Schema, { name: name, modelProps: modelProps });
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


function Schema(name, modelProps) {
  this.fields = [];
  this.name = name;
  this.modelProps = modelProps;
  
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

  /**
   * Return an object representing this schema as a string
   */
  this.objectToString = function (obj) {
    var str = '';
    this.modelProps.forEach(function (field) {
      if (str) {
        str += ', ';
      }
      str += field.modelName + '=' + obj[field.modelName];
    });
    return this.name + ' {' + str + '}';
  };

  /**
   * Return an initialised object representing this schema
   */
  this.getObject = function () {
    var obj = {};
    this.modelProps.forEach(function (field) {
      obj[field.modelName] = field.dfltValue;
    });
    obj['schema'] = this;
    obj['toString'] = function () {
      return this.schema.objectToString(this);
    }
    return obj;
  };

  /**
   * Return the default value for a field in this schema
   */
  this.getDfltValue = function (id) {
    var i, value;
    for (i = 0; i < this.modelProps.length; ++i) {
      if (this.modelProps[i].id === id) {
        value = this.modelProps[i].dfltValue;
        break;
      }
    }
    return value;
  };

  /**
   * Read a property and sets its value in an object
   * @param {object} from     - source to read properties from
   * @param {object} args     - arguments object with following properties
   *    {object} obj      - object to update, or if null/undefined a new object is created
   *    {object} schemaId - schema id/array of schema id(s) to read, or if null/undefined all schema fields are read
   *    {boolean} schemaExcludeMode - schema id(s) are ids to exclude 
   *    {object} fromProp - object ({schema id}, {string}), specifying the property names to read from response for schema ids
   *    {object} convert  - function({schema id}, {value}) to convert read values

   * @param {object} obj      - object to update, or if null/undefined a new object is created
   * @param {object} modelId  - schema id/array of schema id field(s) to read, or if null/undefined all schema fields are read
   * @param {object} fromProp - from object property name/array of from object property names to read
   * @param {object} convert  - function({schema id}, {value}) to convert read values
   * @return updated/new object
   */
  this.readProperty = function (from, args  /*obj, modelId, fromProp, convert*/) {
    args = (!args ? {} : args);
    var i, j,
      ids,
      props = (!args.fromProp ? {} : args.fromProp),
      obj = (!args.obj ? this.getObject() : args.obj);

    if (!args.schemaId) {
      // no schema ids specified so read all
      ids = [];
      this.modelProps.forEach(function (field) {
        ids.push(field.id);
      });
    } else {
      // make sure ids is an array
      if (Array.isArray(args.schemaId)) {
        ids = args.schemaId;
      } else {
        ids = [args.schemaId];
      }
      if (args.schemaExcludeMode) {
        // schema ids are ids to exclude
        var exIds = ids;
        ids = [];
        this.modelProps.forEach(function (field) {
          var idx = exIds.findIndex(function (element) {
            return (element === field.id);
          });
          if (idx === -1) {
            ids.push(field.id);
          }
        });
      }
    }
    // read properties
    for (i = 0; i < ids.length; ++i) {
      var modelProp = undefined;
      // find model property corrsponding to id
      for (j = 0; j < this.modelProps.length; ++j) {
        if (this.modelProps[j].id === ids[i]) {
          modelProp = this.modelProps[j];
          break;
        }
      }
      if (modelProp) {
        var property = props[ids[i]];
        if (typeof property === 'undefined') {
          property = modelProp.modelName; // same propert name in source
        }
        var read = from[property];
        if (read && args.convert) {
          read = args.convert(ids[i], read);
        }
        obj[modelProp.modelName] = read;
      }
    }
    return obj;
    //var i, j,
    //  ids,
    //  props;
    //if (!obj) {
    //  obj = this.getObject();
    //}
    //if (typeof obj === 'function') {
    //  convert = obj;
    //  fromProp = undefined;
    //  modelId = undefined;
    //  obj = this.getObject();
    //}
    //if (typeof modelId === 'function') {
    //  convert = modelId;
    //  fromProp = undefined;
    //  modelId = undefined;
    //}
    //if (typeof fromProp === 'function') {
    //  convert = fromProp;
    //  fromProp = undefined;
    //}
    //if (!modelId) {
    //  // no schema ids specified so read all
    //  ids = [];
    //  this.modelProps.forEach(function (field) {
    //    ids.push(field.id);
    //  });
    //} else {
    //  // make sure ids is an array
    //  if (Array.isArray(modelId)) {
    //    ids = modelId;
    //  } else {
    //    ids = [modelId];
    //  }
    //}
    //// make sure props is an array
    //if (Array.isArray(fromProp)) {
    //  props = fromProp;
    //} else {
    //  props = [fromProp];
    //}
    //// read properties
    //for (i = 0; i < ids.length; ++i) {
    //  var modelProp = undefined;
    //  // find model property corrsponding to id
    //  for (j = 0; j < this.modelProps.length; ++j) {
    //    if (this.modelProps[j].id === ids[i]) {
    //      modelProp = this.modelProps[j];
    //      break;
    //    }
    //  }
    //  if (modelProp) {
    //    var property = (i < props.length ? props[i] : props[props.length - 1])
    //    if (typeof property === 'undefined') {
    //      property = modelProp.modelName; // same propert name in source
    //    }
    //    var read = from[property];
    //    if(read && convert) {
    //      read = convert(ids[i], read);
    //    }
    //    obj[modelProp.modelName] = read;
    //  }
    //}
    //return obj;
  }
}

  
  

