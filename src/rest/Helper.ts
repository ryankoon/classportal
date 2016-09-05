import fs = require('fs');
import Student from '../model/Student';
import Log from '../Util';
var _ = require('lodash');

const pathToRoot = __dirname.substring(0, __dirname.lastIndexOf('classportalserver/')) + 'classportalserver/';
var config = require(pathToRoot + 'config.json');

//General purpose read/write functions
export default class Helper {
    //todo: test!
    //purpose: update students.json or admins.json
    //sample input: "students.json", mksarge, {'hasTeam: true'}, callback
    //implemented with lodash
    static updateUser(userType:string, username: string, paramsObject: any, callback: any) {
        Log.trace("updateUser| Writing to user: " + username + " in students.json..");
        
        var filename = pathToRoot.concat(config.private_folder, userType);
        var file = require(filename);

        //check if username exists
        var userIndex:number = _.findIndex(file, { 'github_name': username });
        if (userIndex >= 0) {
            //update file
            var count = 0;
            for (var key in paramsObject) {
                if (file[userIndex].hasOwnProperty(key)) {
                    Log.trace('updateStudentOrAdmin| Writing to ' + key + ': ' + paramsObject[key]);
                    file[userIndex][key] = paramsObject[key];
                    count++;
                }
            }
            Log.trace('updateUser| Updated ' + count + ' key(s).');

            //write to file
            fs.writeFile(filename, JSON.stringify(file, null, 2), function (err: any) {
                if (err) {
                    Log.trace("updateUser| Write unsuccessful: " + err.toString());
                    callback(true, null);
                    return;
                }
                else {
                    Log.trace("updateUser| Write successful! Executing callback..");
                    callback(null, true);
                    return;
                }
            });
        }
        else {
            Log.trace("updateUser| Error: User was not found..");
            callback(true, null);
            return;
        }
    }
    
    /*these functions still need to be cleaned up and checked for errors*/
    static parseClasslist(file: any, callback: any) {
        Log.trace("parseCSV| Reading file..");
        
        fs.readFile(file, function read(err: any, data: any) {
            if (err) {
                Log.trace("parseCSV| Error reading file: " + err.toString());
                return;
            }
            else {
                Log.trace("parseCSV| File read successfully.");
                
                var lines = data.toString().split(/\n/);
                Log.trace("parseCSV| Classlistlist retrieved. There are " + (lines.length - 1) + " students in the class list.");

                // Splice up the first row to get the headings
                Log.trace("parseCSV| Headings: " + lines[0]);
                var headings = lines[0].split(',');

                //data arrays are set up specifically for our class.csv format
                var studentObject: any[] = [];

                // Split up the comma seperated values and sort into arrays
                for (var index = 1; index < lines.length; index++) {
                    Log.trace("index: " + index);
                    var values = lines[index].split(',');
                    var newStudent = {
                        "sid": "",
                        "csid": "",
                        "firstname": "",
                        "lastname": "",
                        "github_name": "",
                        "github_token": "",
                        "hasTeam": false
                    };
                    newStudent.csid = values[0];
                    newStudent.sid = values[1];
                    newStudent.lastname = values[2];
                    newStudent.firstname = values[3];
                    studentObject.push(newStudent);
                }
                
                Log.trace("parseCSV| Sending class list.." + JSON.stringify(studentObject));
                callback(studentObject);
                return;
            }
        });
    }

    //todo: on login, let students only log in if student exists
    //in classlist, not in students.json. if not, redirect to error page (Please email prof holmes @ ..)
    //todo: make sure we don't overwrite existing info by accident!
    static updateStudents(classlist: any, callback: any) {
        Helper.returnFile("students.json", function (error: any, data: any) {
            var studentsFile: any[];

            //check if response exists and is not 0-length file
            //todo: look into streams instead of fs.readFile
            if (!error && data.length > 0) {
                studentsFile = JSON.parse(data);
            }
            else {
                studentsFile = [];
            }

            var studentsAdded: number = 0;
            for (var index = 1; index < classlist.length; index++) {
                var studentInfo = classlist[index].split(','); //csid, sid, lastname, firstname
                if (!!studentInfo[0] && !!studentInfo[1] && !!studentInfo[2] && !!studentInfo[3]) {
                    //check if student exists in students.json
                    if (!!studentsFile.find((student: any) => student.sid === studentInfo[1])) {
                        //Log.trace("updateStudents| Student file exists already!");
                    }
                    //else, add blank student to students.json
                    else {
                        var newStudent = {
                            "csid": studentInfo[0],
                            "sid": studentInfo[1],
                            "lastname": studentInfo[2],
                            "firstname": studentInfo[3],
                            "github_name": "",
                            "github_token": "",
                            "hasTeam": false
                        };
                        //studentsFile[studentsFile.length] = newStudent;
                        studentsFile.push(newStudent);
                        studentsAdded++;
                    }
                    //for students who were already in students.json but not in new classlist:
                    //should we not let them log in? do nothing for now.
                }
                else {
                    Log.trace("updateStudents| This line is empty or badly formatted.");
                }
            }
            //done updating
            Log.trace("updateStudents| Added " + studentsAdded + " new students to students.json");
            var filename = pathToRoot.concat(config.path_to_students);
            fs.writeFile(filename, JSON.stringify(studentsFile, null, 2), function (err: any) {
                if (err) {
                    Log.trace("updateStudents| Write error: " + err.toString());
                    return;
                }
                else {
                    Log.trace("updateStudents| Write successful.");
                    callback(true);
                    return;
                }
            });
        });
    }


    //todo: returns bad data when reading empty (0-length) file. look into i/o streams    
    static returnFile(file: string, callback: any) {
        Log.trace("returnFile| Accessing: " + file);
        var filename = pathToRoot.concat(config.private_folder, file);

        fs.readFile(filename, function read(err: any, data: any) {
            if (err) {
                Log.trace("returnFile| Error reading file! Returning error..");
                callback(true, null);
                return;
            }
            else {
                Log.trace("returnFile| File read successfully! Returning data..");
                callback(null, data);
                return;
            }
        });
    }

    //TODO: fix with lodash
    static returnStudent(username: string, callback: any) {
        Log.trace("returnStudent| Accessing students.json");
        var filename = pathToRoot.concat(config.path_to_students);
        
        fs.readFile(filename, function read(err: any, data: any) {
            if (err) {
                Log.trace("returnStudent| Error reading file: " + err.toString());
                return;
            }
            else {
                Log.trace("returnStudent| Checking for user " + username);
                var studentFile = JSON.parse(data);

                //check if any index in studentFile has a sid that matches the supplied username
                if (studentFile.some((studentObject: any) => username === studentObject.sid)) {
                    Log.trace("returnStudent| Successfully accessed " + username + ".");
                    
                    //needs fixing
                    //callback(studentFile[username]);
                    return;
                }
                else {
                    Log.trace("returnStudent| Username not found.");
                    callback(null);
                    return;
                }
            }
        });
    }

    static isAdmin(username: string, callback: any) {
        Log.trace("isAdmin| Checking admin status..");
        var filename = pathToRoot.concat(config.path_to_admins);

        fs.readFile(filename, function read(err: any, data: any) {
            if (err) {
                Log.trace("isAdmin| Error reading file: " + err.toString());
                callback(false);
                return;
            }
            else {
                var file = JSON.parse(data);
                if (_.findIndex(file, { 'github_name': username }) >= 0) {
                    Log.trace("isAdmin| User is an admin.");
                    callback(true);
                    return;
                }
                else {
                    Log.trace("isAdmin| User is not an admin.");
                    callback(false);
                    return;
                }
            }
        });
    }
}