/*jslint node: true */
/*global angular */
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

    var idTagEnd = '.',
      makeIdTag = function (name) {
        return name + idTagEnd;
      },
      // note: each needs to be unique
      typeUnknown = 'unkwn',
      typeStr = 'str',
      typeDate = 'date',
      typeBool = 'bool',
      typeNum = 'num',
      typeObj = 'obj',
      typeObjId = 'oId',
      typeArray = '[]',
      isType = function (mType, type) {
        return (mType.indexOf(type) >= 0);
      };
  
    return {
      // schema id tags
      ID_TAG_END: idTagEnd,
      MAKE_ID_TAG: makeIdTag,

      // schema field properties
      DIALOG_PROP: 'dialog',    // property for string used in dialogs
      DISPLAY_PROP: 'display',  // property for display string
      MODEL_PROP: 'model',      // property for field(s) used in db model
      TYPE_PROP: 'type',        // property for type of field
      PATH_PROP: 'path',        // property for path to field
      ID_PROP: 'id',            // property for id used to identify schema
      
      FIELD_TYPES: {
        UNKNOWN: typeUnknown,
        STRING: typeStr,
        DATE: typeDate,
        BOOLEAN: typeBool,
        NUMBER: typeNum,
        OBJECT: typeObj,
        OBJECTID: typeObjId,
        
        STRING_ARRAY: typeStr + typeArray,
        DATE_ARRAY: typeDate + typeArray,
        BOOLEAN_ARRAY: typeBool + typeArray,
        NUMBER_ARRAY: typeNum + typeArray,
        OBJECT_ARRAY: typeObj + typeArray,
        OBJECTID_ARRAY: typeObjId + typeArray,
        
        IS_TYPE: isType,
        IS_STRING: function (mType) {
          return isType(mType, typeStr);
        },
        IS_DATE: function (mType) {
          return isType(mType, typeDate);
        },
        IS_BOOLEAN: function (mType) {
          return isType(mType, typeBool);
        },
        IS_NUMBER: function (mType) {
          return isType(mType, typeNum);
        },
        IS_OBJECT: function (mType) {
          return isType(mType, typeObj);
        },
        IS_OBJECTID: function (mType) {
          return isType(mType, typeObjId);
        },
        IS_ARRAY: function (mType) {
          return isType(mType, typeArray);
        }
      },
      
      // stamdard mongo datge fields
      CREATEDAT: {
        field: 'CREATED', modelName: 'createdAt', dfltValue: undefined, type: typeDate
      },
      UPDATEDAT: {
        field: 'UPDATED', modelName: 'updatedAt', dfltValue: undefined, type: typeDate
      },
      
      // sort direction indicators
      SORT_ASC: '+',
      SORT_DESC: '-',
      SORT_DIRS: SORT_DIRS,
      
      BASIC_SORT_OPTIONS: BASIC_SORT_OPTIONS,
      
      MAKE_SORT_OPTION_VALUE: 
        /**
         * Generate a value for a sort option list item 
         * @param   {string} key    Option asc/desc key, i.e. SORT_ASC or SORT_DESC
         * @param   {string} item   Item name
         * @returns {string} id
         */
        function makeSortOptionValue (key, item) {
          return key + item;
        },

      DECODE_SORT_OPTION_VALUE:
        /**
         * Decode a value for a sort option list item 
         * @param   {string} sort item value
         * @returns {object} decoded id with the following properties:
         *  @param   {string} key  Option asc/desc key
         *  @param   {number} item  Item name
         */
        function decodeSortOptionValue (itemId) {
          return { 
            key: itemId.charAt(0), 
            item: itemId.substr(1)
          };
        },
      
      MAKE_SORT_ITEM_ID: 
        /**
         * Generate an id for a sort option list item 
         * @param   {string} idTag   Schema id string
         * @param   {number} index   Option index
         * @returns {string}  id
         */
        function makeSortItemId (idTag, index) {
          return idTag + index;
        },

      DECODE_SORT_ITEM_ID: 
        /**
         * Decode an id for a sort option list item 
         * @param   {string} sort item id
         * @returns {object} decoded id with the following properties:
         *  @param   {string} idTag Schema id string
         *  @param   {number} index Option index
         */
        function decodeSortItemId (itemId) {
          var splits = itemId.split(idTagEnd);
          return { 
            idTag: makeIdTag(splits[0]), 
            index: parseInt(splits[1])
          };
        }

      
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
      makeSubDocSortList: makeSubDocSortList,

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
    function getSchema(name, modelProps, tag) {
      return $injector.instantiate(Schema, { 
        name: name, 
        modelProps: modelProps,
        tag: tag
      });
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
            value: SCHEMA_CONST.MAKE_SORT_OPTION_VALUE(sort.key, field.dialog),
            id: SCHEMA_CONST.MAKE_SORT_ITEM_ID(idTag, index)
          });
        });
      });

      return sortOptions;
    }

    /**
     * Generate a sort option list based on the specified schema object
     * @param   {Array}    subDocOptions Sub doc sort options
     * @param   {Array}    path          Path to subdoc in this schema
     * @param   {Object}   args          Additional optinal arguments:
     *    @param   {Array}    exOptions     Sub doc options to exclude
     *    @param   {Array}    addTo         Options array to add to
     *    @param   {function} cb            Function to call for each option being added
     * @returns {Array}    List of sort options
     */
    function makeSubDocSortList (subDocOptions, path, args) {

      var sortOptions,
        i,
        ex,
        pathArray;

      if (typeof path === 'string') {
        pathArray = [path];
      } else if (Object.prototype.toString.call(path) === '[object Array]') {
        pathArray = path;
      } else if (typeof path === 'object') {
        args = path;
      }
      if (!args) {
        args = {};
      }

      if (!args.exOptions) {
        sortOptions = angular.copy(subDocOptions);
      } else {
        sortOptions = [];
        subDocOptions.forEach(function (option) {
          ex = false;
          for (i = 0; !ex && (i < args.exOptions.length); ++i) {
            ex = (option.value === args.exOptions[i].value);
          }
          if (!ex) {
            sortOptions.push(angular.copy(option));
          }
        });
      }
      sortOptions.forEach(function (option) {
        option.path = pathArray;
        if (args.cb) {
          args.cb(option);
        }
        if (args.addTo) {
          args.addTo.push(option);
        }
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


function Schema (SCHEMA_CONST, name, modelProps, tag) {
  var self = this;
  
  self.fields = [];
  self.name = name;
  self.modelProps = modelProps;
  self.tag = tag;
  
  /**
   * Add a new entry to the Schema
   * @param   {string}       dialog  String used in dialogs
   * @param   {string}       display String displayed in dialogs
   * @param   {Array|object} model   Field(s) from dm model
   * @param   {string}       type    field type
   * @param   {Object}       args    Additional optinal arguments:
   *    @param   {Array|object} path    Field(s) providing path to field
   *    @param   {function}     cb      Function to call for each option
   * @returns {number}       index of added entry
   */
  self.addField = function (dialog, display, model, type, args) {
    var modelArray,
      pathArray,
      field;
    if (!Array.isArray(model)) {
      modelArray = [model];
    } else {
      modelArray = model;
    }
    if (args && args.path) {
      if (!Array.isArray(args.path)) {
        pathArray = [args.path];
      } else {
        pathArray = args.path;
      }
    }
    field = {
      dialog: dialog,
      display: display,
      model: modelArray,
      type: type,
      path: pathArray,
      id: self.tag
    };
    if (args && args.cb) {
      args.cb(field);
    }
    self.fields.push(field);
    return (self.fields.length - 1);
  };
  
  /**
   * Add a new entry to the Schema
   * @param   {string}       dialog  String used in dialogs
   * @param   {string}       display String displayed in dialogs
   * @param   {Array|number} id      Schema id index or array of, e.g. 'ADDRSCHEMA.IDs.ADDR1'
   * @param   {Object}       args    Additional optinal arguments:
   *    @param   {Array|object} path    Field(s) providing path to field
   *    @param   {function}     cb      Function to call for each option
   * @returns {number}       index of added entry
   */
  self.addFieldFromModelProp = function (dialog, display, id, args) {
    var idArray, 
      modelArray = [],
      type = SCHEMA_CONST.FIELD_TYPES.UNKNOWN,
      modelProp;

    if (!Array.isArray(id)) {
      idArray = [id];
    } else {
      idArray = id;
    }
    idArray.forEach(function (sId) {
      modelProp = self.getModelProp(sId);
      if (modelProp.modelName) {
        modelArray.push(modelProp.modelName);
      } else {
        throw new Error('Missing modelName');
      }
      
      if (type === SCHEMA_CONST.FIELD_TYPES.UNKNOWN) {
        type = modelProp.type;  // first time init
      }
      if (modelProp.type !== type) {
        throw new Error('Type mismatch in multi-model');
      } else {
        if (!type) {
          throw new Error('Missing type');
        }
      }
    });
    
    return self.addField(dialog, display, modelArray, type, args);
  };
  
  /**
   * Return the schema field with the specified index. 
   * @param   {number} index    Index of field to return
   * @param   {string} property Property of field to return
   * @returns {object} Field object or property
   */
  self.getField = function (index, property) {
    var result;
    if ((index >= 0) && (index < self.fields.length)) {
      if (typeof property === 'string') {
        // return specific property of entry
        result = self.fields[index][property];
      } else {
        // return whole entry
        result = self.fields[index];
      }
    }
    return result;
  };

  /**
   * Callback the specified function for each field in the schema, providing the field details as the callback arguments
   * @param {function} callback Function to callback taking the arguments:
   *    @param {number}   schema field index
   *    @param {object}   schema field details @see Schema.addField for details
   */
  self.forEachField = function (callback) {
    if (typeof callback === 'function') {
      for (var i = 0; i < self.fields.length; ++i) {
        callback(i, self.fields[i]);
      }
    }
  };

  /**
   * Return an object representing this schema as a string
   */
  self.objectToString = function (obj) {
    var str = '';
    self.modelProps.forEach(function (field) {
      if (str) {
        str += ', ';
      }
      str += field.modelName + '=' + obj[field.modelName];
    });
    return self.name + ' {' + str + '}';
  };

  /**
   * Return an initialised object representing this schema
   */
  self.getObject = function () {
    var obj = {};
    self.modelProps.forEach(function (field) {
      obj[field.modelName] = field.dfltValue;
    });
    obj.schema = this;
    obj.toString = function () {
      return this.schema.objectToString(this);
    };
    return obj;
  };

  /**
   * Return the default value for a field in this schema
   * @param {number} id       Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
   * @param {string} property Name of property to return 
   * @return {object} modelProp object or property of modelProp object
   */
  self.getModelProp = function (id, property) {
    var i, value;
    for (i = 0; i < self.modelProps.length; ++i) {
      if (self.modelProps[i].id === id) {
        if (property) {
          value = self.modelProps[i][property];
        } else {
          value = self.modelProps[i];
        }
        break;
      }
    }
    return value;
  };

  /**
   * Return the default value for a field in this schema
   * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
   * @return {object} default value of field
   */
  self.getDfltValue = function (id) {
    return self.getModelProp(id, 'dfltValue');
  };

  /**
   * Return the type for a field in this schema
   * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
   * @return {string} type of field
   */
  self.getType = function (id) {
    return self.getModelProp(id, 'type');
  };

  /**
   * Return the model path name for a field in this schema
   * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
   * @return {string} model path name of field
   */
  self.getModelName = function (id) {
    return self.getModelProp(id, 'modelName');
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
  self.readProperty = function (from, args) {
    args = (!args ? {} : args);
    var i, j,
      ids,
      props = (!args.fromProp ? {} : args.fromProp),
      obj = (!args.obj ? self.getObject() : args.obj);

    if (!args.schemaId) {
      // no schema ids specified so read all
      ids = [];
      self.modelProps.forEach(function (field) {
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
        self.modelProps.forEach(function (field) {
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
      for (j = 0; j < self.modelProps.length; ++j) {
        if (self.modelProps[j].id === ids[i]) {
          modelProp = self.modelProps[j];
          break;
        }
      }
      if (modelProp) {
        var property = props[ids[i]],
          read;
        if (typeof property === 'undefined') {
          property = modelProp.modelName; // same propert name in source
        }
        
        // if it has the property read & possibly convert it, otherwise set to undefined
        read = undefined;
        if (from.hasOwnProperty(property)) {
          read = from[property];
          if (args.convert) {
            read = args.convert(ids[i], read);
          }
        }
        obj[modelProp.modelName] = read;
      }
    }
    return obj;
  };
}

  
  

