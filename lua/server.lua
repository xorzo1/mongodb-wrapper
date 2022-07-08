RegisterCommand("CreateDocument", function()

    local schema = {
        username = "xorzo",
        array = {}
    }

    exports.mongodb:insertOne({ collection = "users", document = schema }, function(success, result, insertedIds)
        if not success then
            print("[Example] Error in insertOne: "..result)
            return;
        end
        print("[Example] User created. New ID: "..insertedIds[1])
        print(insertedIds[1])
    end)
end)

RegisterCommand("findDocument", function()
    exports.mongodb:find({ collection = "users", query = {username = "xorzo"} }, function (success, result)
        if not success then
            return;
        end
        print(ESX.DumpTable(result))
    end)
end)