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
      makeArrayType = function (type) {
        return (type + typeArray);
      },
      typeStrArray = makeArrayType(typeStr),
      typeDateArray = makeArrayType(typeDate),
      typeBoolArray = makeArrayType(typeBool),
      typeNumArray = makeArrayType(typeNum),
      typeObjArray = makeArrayType(typeObj),
      typeObjIdArray = makeArrayType(typeObjId),
      isType = function (mType, type) {
        return (mType === type);
      },
      isPartType = function (mType, type) {
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
        
        STRING_ARRAY: typeStrArray,
        DATE_ARRAY: typeDateArray,
        BOOLEAN_ARRAY: typeBoolArray,
        NUMBER_ARRAY: typeNumArray,
        OBJECT_ARRAY: typeObjArray,
        OBJECTID_ARRAY: typeObjIdArray,
        
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
          return isPartType(mType, typeArray);
        },
        IS_STRING_ARRAY: function (mType) {
          return isType(mType, typeStrArray);
        },
        IS_DATE_ARRAY: function (mType) {
          return isType(mType, typeDateArray);
        },
        IS_BOOLEAN_ARRAY: function (mType) {
          return isType(mType, typeBoolArray);
        },
        IS_NUMBER_ARRAY: function (mType) {
          return isType(mType, typeNumArray);
        },
        IS_OBJECT_ARRAY: function (mType) {
          return isType(mType, typeObjArray);
        },
        IS_OBJECTID_ARRAY: function (mType) {
          return isType(mType, typeObjIdArray);
        }
      },
      
      // stamdard mongo datge fields
      ID: {
        field: 'ID', modelName: '_id', dfltValue: undefined, type: typeObjId
      },
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
  }()))

/* A schema object provider, with help from https://www.bennadel.com/blog/2788-creating-a-factory-provider-for-the-configuration-phase-in-angularjs.htm
  NOTE: The provider can have other providers injected, but it cannot inject 
	services as this will be created during the configuration phase, before 
	services have been made available.

  NOTE: The ProvideSchema() function is going to be instantiated using the
	"new" operator; as such, we could use the "this" reference to define object
	properties and methods. But this implementation returns a public API.
*/
  .provider('schema', ['$injector', 'SCHEMA_CONST', function ProvideSchema($injector, SCHEMA_CONST) {

    var modelPropProperties = ['id', 'modelName', 'modelPath', 'factory', 'dfltValue', 'type'];

    /**
     * Create a Schema object
     * @returns {object} new Schema object
     */
    function getSchema(name, modelProps, ids, tag) {
      return $injector.instantiate(Schema, {
        name: name,
        modelProps: modelProps,
        ids: ids,
        tag: tag
      });
    }

    /**
     * Create a ModelProp object
     * @returns {object} new ModelProp object
     */
    function getModelPropObject(args) {
      var vals = {};
      modelPropProperties.forEach(function (prop) {
        if (args.hasOwnProperty(prop)) {
          vals[prop] = args[prop];
        } else {
          vals[prop] = undefined;
        }
      });
      return $injector.instantiate(ModelProp, vals);
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

    
    function ModelProp (id, modelName, modelPath, factory, dfltValue, type) {
      this.id = id;
      this.modelName = modelName;
      this.modelPath = modelPath;
      this.factory = factory;
      this.dfltValue = dfltValue;
      this.type = type;
    }
    
    ModelProp.$inject = ['id', 'modelName', 'modelPath', 'factory', 'dfltValue', 'type'];


    ModelProp.prototype.matches = function (args) {
      var hits = 0,
        target = 0,
        tested = false;
      for (var prop in args) {
        tested = true;
        ++target;
        if (this.hasOwnProperty(prop)) {
          if (typeof args[prop] === 'function') {
            if (args[prop](this[prop])) {
              ++hits;
            }
          } else if (args[prop] === this[prop]) {
            ++hits;
          }
        }
      }
      return (tested && (hits === target));
    };


    function Schema (SCHEMA_CONST, RESOURCE_CONST, name, modelProps, ids, tag) {

      this.SCHEMA_CONST = SCHEMA_CONST;
      this.RESOURCE_CONST = RESOURCE_CONST;
      this.fields = [];
      this.name = name;
      this.modelProps = modelProps;
      this.ids = ids;
      this.tag = tag;
    }

    Schema.$inject = ['SCHEMA_CONST', 'RESOURCE_CONST', 'name', 'modelProps', 'ids', 'tag'];
    
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
    Schema.prototype.addField = function (dialog, display, model, type, args) {
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
        id: this.tag
      };
      if (args && args.cb) {
        args.cb(field);
      }
      this.fields.push(field);
      return (this.fields.length - 1);
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
    Schema.prototype.addFieldFromModelProp = function (dialog, display, id, args) {
      var idArray,
        modelArray = [],
        type = this.SCHEMA_CONST.FIELD_TYPES.UNKNOWN,
        modelProp;

      if (!Array.isArray(id)) {
        idArray = [id];
      } else {
        idArray = id;
      }
      idArray.forEach(function (sId) {
        modelProp = this.getModelProp(sId);
        if (modelProp.modelName) {
          modelArray.push(modelProp.modelName);
        } else {
          throw new Error('Missing modelName');
        }

        if (type === this.SCHEMA_CONST.FIELD_TYPES.UNKNOWN) {
          type = modelProp.type;  // first time init
        }
        if (modelProp.type !== type) {
          throw new Error('Type mismatch in multi-model');
        } else {
          if (!type) {
            throw new Error('Missing type');
          }
        }
      }, this);

      return this.addField(dialog, display, modelArray, type, args);
    };

    /**
     * Return the schema field with the specified index. 
     * @param   {number} index    Index of field to return
     * @param   {string} property Property of field to return
     * @returns {object} Field object or property
     */
    Schema.prototype.getField = function (index, property) {
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
     * @param {function} callback Function to callback taking the arguments:
     *    @param {number}   schema field index
     *    @param {object}   schema field details @see Schema.addField for details
     */
    Schema.prototype.forEachField = function (callback) {
      if (typeof callback === 'function') {
        for (var i = 0; i < this.fields.length; ++i) {
          callback(i, this.fields[i]);
        }
      }
    };

    /**
     * Return an object representing this schema as a string
     */
    Schema.prototype.objectToString = function (obj) {
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
    Schema.prototype.getObject = function () {
      var obj = {};
      this.modelProps.forEach(function (field) {
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
    Schema.prototype.getModelPropList = function (args) {
      var result = [];
      this.modelProps.forEach(function (mdlProp) {
        if (mdlProp.matches(args)) {
          result.push(mdlProp);
        }
      });
      return result;
    };

    /**
     * Return the default value for a field in this schema
     * @param {number} id       Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @param {string} property Name of property to return 
     * @return {object} modelProp object or property of modelProp object
     */
    Schema.prototype.getModelProp = function (id, property) {
      var i, value;
      for (i = 0; i < this.modelProps.length; ++i) {
        if (this.modelProps[i].id === id) {
          if (property) {
            value = this.modelProps[i][property];
          } else {
            value = this.modelProps[i];
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
    Schema.prototype.getDfltValue = function (id) {
      return this.getModelProp(id, 'dfltValue');
    };

    /**
     * Return the type for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} type of field
     */
    Schema.prototype.getType = function (id) {
      return this.getModelProp(id, 'type');
    };

    /**
     * Return the storage type for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} storage type of field; RESOURCE_CONST.STORE_LIST/STORE_OBJ
     */
    Schema.prototype.getStorageType = function (id) {
      var type;
      if (this.SCHEMA_CONST.FIELD_TYPES.IS_ARRAY(this.getType(id))) {
        type = this.RESOURCE_CONST.STORE_LIST;
      } else {
        type = this.RESOURCE_CONST.STORE_OBJ;
      }
      return type;
    };

    /**
     * Return the model path name for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} model path name of field
     */
    Schema.prototype.getModelName = function (id) {
      return this.getModelProp(id, 'modelName');
    };

    /**
     * Return the factory name for a field in this schema
     * @param {number} Schema id index, e.g. 'ADDRSCHEMA.IDs.ADDR1'
     * @return {string} factory name of field
     */
    Schema.prototype.getModelFactory = function (id) {
      return this.getModelProp(id, 'factory');
    };

    /**
     * Read a property and sets its value in an object/array
     * @param {object} from     - source to read properties from
     * @param {object} args     - arguments object
     *  @see readProperty() for properties
     * @return updated/new object
     */
    Schema.prototype.read = function (from, args) {
      args = (!args ? {} : args);
      var i,
        result,
        objArgs = angular.copy(args);

      objArgs._ids = this._getIdsToRead(objArgs);

      if (from) {
        if (Array.isArray(from)) {
          // read array of object
          if (args.obj) {
            if (!Array.isArray(args.obj)) {
              throw new Error('Non-array update object argument');
            }
            result = args.obj;
          } else {
            result = [];
          }
          for (i = 0; i < from.length; ++i) {
            objArgs = angular.copy(args);
            if (objArgs.obj) {
              objArgs.obj = objArgs.obj[i]; // update appropriate index
            }
            result[i] = this.readProperty(from[i], objArgs);
          }
        } else {
          // read single object
          result = this.readProperty(from, objArgs);
        }
      }
      return result;
    };

    /**
     * Internal function to determine the schema ids for readProperty
     * @param {object} args     - arguments object
     * @return {array} ids array
     */
    Schema.prototype._getIdsToRead = function (args) {
      var ids;

      if (!args.schemaReadIds) {
        // no schema ids specified so read all
        ids = [];
        this.modelProps.forEach(function (field) {
          ids.push(field.id);
        });
      } else {
        // make sure ids is an array
        if (Array.isArray(args.schemaReadIds)) {
          ids = args.schemaReadIds;
        } else {
          ids = [args.schemaReadIds];
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
      return ids;
    };

    /**
     * Read a property and sets its value in an object
     * @param {object} from     - source to read properties from
     * @param {object} args     - arguments object with following properties
     *    {object} obj          - object to update, or if null/undefined a new object is created
     *    {number|array} schemaReadIds - schema id/array of schema id(s) to read, or if null/undefined all schema fields are read
     *    {boolean} schemaExcludeMode - schema id(s) are ids to exclude 
     *    {number|array} schemaPruneIds - schema id/array of schema id(s) to remove from final object
     *    {object} fromProp - object ({schema id}, {string}), specifying the property names to read from response for schema ids
     *    {object} convert  - function({schema id}, {value}) to convert read values
     * @return updated/new object
     */
    Schema.prototype.readProperty = function (from, args) {
      args = (!args ? {} : args);
      var i,
        ids,
        props = (!args.fromProp ? {} : args.fromProp),
        obj = (!args.obj ? this.getObject() : args.obj),
        searcher = new SearchStdArg(args);

      if (from) {
        if (args._ids) {
          ids = args._ids;
        } else {
          ids = this._getIdsToRead(args);
        }
        // read properties
        for (i = 0; i < ids.length; ++i) {
          // find model property corrsponding to id
          var modelProp = this.getModelProp(ids[i]);
          if (modelProp) {
            var property = props[ids[i]],
              read;
            if (property === undefined) {
              property = modelProp.modelName; // same property name in source
            }
            searcher.setModelProp(modelProp);

            // if it has the property read & possibly convert it, otherwise set to undefined
            read = undefined;
            if (from.hasOwnProperty(property)) {
              read = from[property];

              /* need to pass run stage injector to Schema object as since it is created during the config
                stage it only has access to the config stage injector (only providers and constants accessible) */
              if (modelProp.factory && args.injector) {
                // process it through the appropriate factory
                var factory = args.injector.get(modelProp.factory);
                if (factory.readRspObject) {
                  // find specific args if available
                  var readArgs = searcher.findInStandardArgs();

                  if (readArgs) {
                    // use the appropriate function to read the object(s)
                    readArgs = angular.copy(readArgs);
                    // don't need schema/schemaId/path as its read as a root object from here
                    delete readArgs.schema;
                    delete readArgs.schemaId;
                    delete readArgs.path;

                    if (Array.isArray(read)) {
                      for (var ridx = 0; ridx < read.length; ++ridx) {
                        readArgs.obj = read[ridx];   // inplace update
//                        console.log('factory.readRspObject', ridx, readArgs.objId[0]);
                        factory.readRspObject(read[ridx], readArgs);
                      }
                    } else {
                      read = factory.readRspObject(read, readArgs);
                    }
                  } // else no specific args will set read value
                }
              }
              if (args.convert) {
                read = args.convert(modelProp.id, read);
              }
            }
            obj[modelProp.modelName] = read;
          }
        }
      }
      if (args.schemaPruneIds) {
        args.schemaPruneIds.forEach(function (id) {
          var modelName = this.getModelName(id);
          if (modelName) {
            delete obj[modelName];
          }
        }, this);
      }

//      console.log('readProperty', args, obj);

      return obj;
    };


    function SearchStdArg (args) {
      this.args = args;
      this.modelProp = undefined;
    }

    SearchStdArg.$inject = ['args'];

    SearchStdArg.prototype.setModelProp = function (modelProp) {
      this.modelProp = modelProp;
    };

    SearchStdArg.prototype.findInStandardArgs = function () {
      var testFxn = function (arg) {
        return (arg.schemaId === this.modelProp.id);
      },
      boundFxn = testFxn.bind(this);
      return this.args.findInStandardArgs(this.args, boundFxn);
    };
    
    
    // Return the public API for the provider.
    return({
      getSchema: getSchema,
      getModelPropObject: getModelPropObject,
      makeSortList: makeSortList,
      makeSubDocSortList: makeSubDocSortList,

      // The provider must include a $get() method that will be our 
      // factory function for creating the service. This $get() method 
      // will be invoked using $injector.invoke() and can therefore use
      // dependency-injection.
      $get: instantiateProvider
    });


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

