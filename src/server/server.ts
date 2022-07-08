const mongodb = require("mongodb");
const client = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

const databaseURL = GetConvar("mongodb_url", "unknown");
const databaseName = GetConvar("mongodb_name", "unknown");

let database = null;

if (databaseURL === "unknown") {
    throw new Error("Database URL is not specified")
}

if (databaseName === "unknown") {
    throw new Error("Database name is not specified")
}

client.connect(databaseURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err, client) => {
    if (err) throw new Error(`Database connection FAILED: ${err}`)

    database = client.db(databaseName)
    console.log(`Database connection established \`${databaseName}\``)
})

const checkDatabaseConnection = () => {
    if (!database) {
        throw new Error("Database connection not established");
    }
    return true;
}

const checkParams = (params) => {
    return params !== null && typeof params === 'object';
}

const getParamsCollection = (params) => {
    if (!params.collection) return;
    return database.collection(params.collection)
}

// Utilities

const exportDocument = (document) => {
    if (!document) return;
    if (document._id && typeof document._id !== "string") {
        document._id = document._id.toString();
    }
    return document;
}

const exportDocuments = (documents) => {
    if (!Array.isArray(documents)) return;
    return documents.map((document => exportDocument(document)));
}

const safeObjectArgument = (object) => {
    if (!object) return {};
    if (Array.isArray(object)) {
        return object.reduce((acc, value, index) => {
            acc[index] = value
            return acc
        }, {});
    }
    if (typeof object !== "object") return {};
    if (object._id) object._id = ObjectId(object._id);
    return object
}

const safeCallback = (cb, ...args) => {
    if (typeof cb === "function") return setImmediate(() => cb(...args));
    else return false;
}

// Methods

/**
 * @param callback
 * @param {Object} params
 * @param {Array}  params.documents
 * @param {Object} params.options
 */

const databaseInsert = (params, callback) => {
    if (!checkDatabaseConnection()) return;
    if (!checkParams(params)) throw new Error("[ERROR] exports.insert: Invalid params object.");

    let collection = getParamsCollection(params);
    if (!collection) throw new Error(`[ERROR] exports.insert: Invalid collection ${params.collection}`);

    let documents = params.documents;
    if (!documents || !Array.isArray(documents)) throw new Error("[ERROR] exports.insert: Invalid params.documents value. Expected object or array of objects.");

    const options = safeObjectArgument(params.options)

    collection.insertMany(documents, options, (err, result) => {
        if (err) {
            safeCallback(callback, false, err)
            throw new Error(`[ERROR] exports.insert: ${err}`)
        }
        let arrOfIds = [];

        for (let key in result.insertedIds) {
            if (result.insertedIds.hasOwnProperty(key)) {
                arrOfIds[parseInt(key)] = result.insertedIds[key].toString();
            }
        }
        safeCallback(callback, true, result.insertedCount, arrOfIds);
    })
}

/**
 * @param callback
 * @param {Object} params - Params object
 * @param {Object} params.query - Filter query object.
 * @param {Object} params.update - Update query object.
 * @param {Object} params.options - Options passed to insert.
 */
const databaseFind = (params, callback) => {
    if (!checkDatabaseConnection()) return;
    if (!checkParams(params)) throw new Error("[ERROR] exports.find: Invalid params object.")

    let collection = getParamsCollection(params);
    if (!collection) throw new Error(`[ERROR] exports.insert: Invalid collection ${params.collection}`)

    const query = safeObjectArgument(params.query)
    const options = safeObjectArgument(params.options)

    let cursor = collection.find(query, options)
    if (params.limit) cursor = cursor.limit(params.limit)
    cursor.toArray((err, documents) => {
        if (err) {
            safeCallback(callback, false, err)
            throw new Error(`[ERROR] exports.find: ${err}`)
        }
        safeCallback(callback, true, exportDocuments(documents))
    })
}

/**
 * @param callback
 * @param isUpdatedOne
 * @param {Object} params - Params object
 * @param {Object} params.query - Filter query object.
 * @param {Object} params.update - Update query object.
 * @param {Object} params.options - Options passed to insert.
 */
const databaseUpdate = (params, callback, isUpdatedOne) => {
    if (!checkDatabaseConnection()) return;
    if (!checkParams(params)) throw new Error("[ERROR] exports.update: Invalid params object.")

    let collection = getParamsCollection(params);
    if (!collection) throw new Error(`[ERROR] exports.update: Invalid collection ${params.collection}`)

    let query = safeObjectArgument(params.query)
    let update = safeObjectArgument(params.update)
    let options = safeObjectArgument(params.options)

    const cb = (err, res) => {
        if (err) {
            safeCallback(callback, false, err)
            throw new Error(`[ERROR] exports.update: ${err}`)
        }
        safeCallback(callback, true, res.result.nModified)
    }
    isUpdatedOne ? collection.updateOne(query, update, options, cb) : collection.updateMany(query, update, options, cb);
}

/**
 * @param callback
 * @param {Object} params - Params object
 * @param {Object} params.query - Query object.
 * @param {Object} params.options - Options passed to insert.
 */
const databaseCount = (params, callback) => {
    if (!checkDatabaseConnection()) return;
    if (!checkParams(params)) throw new Error("[ERROR] exports.count: Invalid params object.");

    let collection = getParamsCollection(params);
    if (!collection) throw new Error(`[ERROR] exports.count: Invalid collection ${params.collection}`);

    const query = safeObjectArgument(params.query);
    const options = safeObjectArgument(params.options);

    collection.countDocuments(query, options, (err, count) => {
        if (err) {
            safeCallback(callback, false, err)
            throw new Error(`[ERROR] exports.count ${err}`)
        }
        safeCallback(callback, true, count)
    });
}

/**
 * @param callback
 * @param isDeleteOne
 * @param {Object} params - Params object
 * @param {Object} params.query - Query object.
 * @param {Object} params.options - Options passed to insert.
 */
const databaseDelete = (params, callback, isDeleteOne) => {
    if (!checkDatabaseConnection()) return;
    if (!checkParams(params)) throw new Error("[ERROR] exports.delete: Invalid params object.");

    let collection = getParamsCollection(params);
    if (!collection) throw new Error(`[ERROR] exports.delete: Invalid collection ${params.collection}`)

    const query = safeObjectArgument(params.query)
    const options = safeObjectArgument(params.options)

    const cb = (err, res) => {
        if (err) {
            safeCallback(callback, false, err)
            throw new Error(`[ERROR] exports.delete: ${err}`)
        }
        safeCallback(callback, true, res.result.n)
    };
    isDeleteOne ? collection.deleteOne(query, options, cb) : collection.deleteMany(query, options, cb);
}

// exports

globalThis.exports("isConnected", () => !!database);

global.exports("insert", databaseInsert);
global.exports("insertOne", (params, callback) => {
    if (checkParams(params)) {
        params.documents = [params.document];
        params.document = null;
    }
    return databaseInsert(params, callback)
})

global.exports("find", databaseFind)
global.exports("findOne", (params, callback) => {
    if (checkParams(params)) params.limit = 1;
    return databaseFind(params, callback);
})

global.exports("update", databaseUpdate);
global.exports("updateOne", (params, callback) => {
    return databaseUpdate(params, callback, true)
})

global.exports("count", databaseCount)

global.exports("delete", databaseDelete)
global.exports("deleteOne", (params, callback) => {
    return databaseDelete(params, callback, true);
})