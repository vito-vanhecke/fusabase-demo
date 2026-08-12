import { initializeApp } from "fusabase/app";
import { getOracledb } from "fusabase/oracledb";
import { getStorage } from "fusabase/storage";
import { getAuth } from "fusabase/auth";
import { authUI } from "fusabase/ui";


const fusabaseConfig = {
    "schema": "vito",
    "app_name": "WEBDEMO",
    "app_type": "WEB",
    "app_id": "58D64B0C789F4307E063F40D1FAC19AD",
    "objs_type": "dbfs",
    "project_id": "58D6470B91BF4302E063F40D1FAC8719",
    "storage_bucket": "dbfs_YALOWOGCQGWKBQN",
    "auth_type": "base",
    "auth_id": "58D6470B91C34302E063F40D1FAC8719",
    "ords_host": "https://oracle.vvanhecke.be/ords/vito/"

}


// intitalize app
const fusabase_app = initializeApp(fusabaseConfig);

// get database instance
const fusabase_db = getOracledb(fusabase_app);

// get object store instance
const fusabase_storage = getStorage(fusabase_app);

// get auth instance
const fusabase_auth = getAuth(fusabase_app);
