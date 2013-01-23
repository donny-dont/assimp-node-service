
var fs = require('fs')
  , os = require('os')
  , http = require('http')
  , path = require('path')
  , process = require('child_process');

//---------------------------------------------------------------------
// Model format information
//---------------------------------------------------------------------
  
/**
 * Listing of extensions for valid input formats.
 */
var inputFormatExtensions = {
  //---------------------------------------------------------------------
  // Common Interchange formats
  //---------------------------------------------------------------------

  'dae'   : 'Collada ( .dae )',
  'blend' : 'Blender 3D ( .blend )',
  '3ds'   : '3ds Max 3DS ( .3ds )',
  'ase'   : '3ds Max ASE ( .ase )',
  'obj'   : 'Wavefront Object ( .obj )',
  'ifc'   : 'Industry Foundation Classes (IFC/Step) ( .ifc )',
  'xgl'   : 'XGL ( .xgl )',
  'zgl'   : 'XGL ( .zgl )',
  'ply'   : 'Stanford Polygon Library ( .ply )',
  'dxf'   : 'AutoCAD DXF ( .dxf )',
  'lwo'   : 'LightWave ( .lwo )',
  'lws'   : 'LightWave Scene ( .lws )',
  'lxo'   : 'Modo ( .lxo )',
  'stl'   : 'Stereolithography ( .stl )',
  'x'     : 'DirectX X ( .x )',
  'ac'    : 'AC3D ( .ac )',
  'ms3d'  : 'Milkshape 3D ( .ms3d )',
  'cob'   : 'TrueSpace ( .cob )',
  'scn'   : 'TrueSpace ( .scn )',
  'fbx'   : 'Autodesk FBX ( .fbx )',

  //---------------------------------------------------------------------
  // Motion capture formats
  //---------------------------------------------------------------------

  'bvh'    : 'Biovision BVH ( .bvh )',
  'csm'    : 'CharacterStudio Motion ( .csm )',

  //---------------------------------------------------------------------
  // Graphics engine formats
  //---------------------------------------------------------------------

  'xml'    : 'Ogre XML ( .xml )',
  'irrmesh': 'Irrlicht Mesh ( .irrmesh )',
  'irr'    : 'Irrlicht Scene ( .irr )',

  //---------------------------------------------------------------------
  // Game file formats
  //---------------------------------------------------------------------

  'mdl'    : 'Quake I ( .mdl )',
  'md2'    : 'Quake II ( .md2 )',
  'md3'    : 'Quake III Mesh ( .md3 )',
  'pk3'    : 'Quake III Map/BSP ( .pk3 )',
  'mdc'    : 'Return to Castle Wolfenstein ( .mdc )',
  'md5'    : 'Doom 3 ( .md5 )',
  'md5mesh': 'Doom 3 ( .md5mesh )',
  'smd'    : 'Valve Model ( .smd )',
  'vta'    : 'Valve Model ( .vta )',
  'm3'     : 'Starcraft II M3 ( .m3 )',
  '3d'     : 'Unreal ( .3d )',

  //---------------------------------------------------------------------
  // Other file formats
  //---------------------------------------------------------------------

  'b3d'    : 'BlitzBasic 3D ( .b3d )',
  'q3d'    : 'Quick3D ( .q3d )',
  'q3s'    : 'Quick3D ( .q3s )',
  'nff'    : 'Neutral File Format ( .nff )',
  'off'    : 'Object File Format ( .off )',
  'raw'    : 'PovRAY Raw ( .raw )',
  'ter'    : 'Terragen Terrain ( .ter )',
  'mdl'    : '3D GameStudio (3DGS) ( .mdl )',
  'hmp'    : '3D GameStudio (3DGS) Terrain ( .hmp )',
  'ndo'    : 'Izware Nendo ( .ndo )',
};
  
/**
 * Listing of extensions for valid output formats.
 */
var outputFormatExtensions = {
  'mesh': 'Spectre ( .mesh )',
  'dae' : 'Collada ( .dae )',
  'obj' : 'Wavefront Object ( .obj )',
  'stl' : 'Stereolithography ( .stl )',
  'ply' : 'Stanford Polygon Library ( .ply )'
};

//---------------------------------------------------------------------
// Assimp command line functions
//---------------------------------------------------------------------

/**
 * Listing of form options and their respective command line parameters.
 */
var commandLineOptions = {
  'pretransformNormals'     : '--pretransform-vertices',
  'genSmoothNormals'        : '--gen-smooth-normals',
  'getNormals'              : '--gen-normals',
  'calcTangentSpace'        : '--calc-tangent-space',
  'joinIdenticalVertices'   : '--join-identical-vertices',
  'removeRedundantMaterials': '--remove-redundant-materials',
  'findDegenerates'         : '--find-degenerates',
  'splitLargeMeshes'        : '--split-large-meshes',
  'limitBoneWeights'        : '--limit-bone-weights',
  'validateDataStructure'   : '--validate-data-structure',
  'improveCacheLocality'    : '--improve-cache-locality',
  'sortByPtype'             : '--sort-by-ptype',
  'convertToLeftHand'       : '--convert-to-lh',
  'flipUVCoords'            : '--flip-uv',
  'flipWindingOrder'        : '--flip-winding-order',
  'transformUVCoords'       : '--transform-uv-coords',
  'generateUVCoords'        : '--gen-uvcoords',
  'findInvalidData'         : '--find-invalid-data',
  'fixNormals'              : '--fix normals',
  'triangulate'             : '--triangulate',
  'findInstances'           : '--find-instances',
  'optimizeGraph'           : '--optimize-graph',
  'optimizeMeshes'          : '--optimize-meshes',
  'debone'                  : '--debone',
  'splitByBoneCount'        : '--split-by-bone-count'
};

/**
 * The path to the assimp conversion tool.
 */
var assimpPath = getAssimpPath();

console.log('Assimp.exe found at ' + assimpPath);

/**
 * Retrieves the path to assimp based on the OS type.
 */
function getAssimpPath() {
  var type = os.type();
  var exePath;
  
  if (type == 'Windows_NT') {
    exePath = 'win32/assimp.exe';
  } else if (type == 'Darwin') {
    exePath = 'osx/assimp';
  } else {
    // Assume linux
    exePath = 'linux/assimp';
  }
  
  return path.join(__dirname, '../bin', exePath);
}

/**
 * Queries whether the option is enabled.
 *
 * @param {string} name The name of the option.
 * @returns {boolean} true if the option is on; false otherwise.
 */
function isOptionEnabled(form, name) {
  if (form[name]) {
    return form[name] == 'on';
  }
  
  return false;
}

/**
 * Gets the options to call assimp with.
 *
 * @returns An array containing the command line options to use.
 */
function getAssimpOptions(form) {
  var options = new Array();

  for (var key in commandLineOptions) {
    if (commandLineOptions.hasOwnProperty(key)) {
      if (isOptionEnabled(form, key)) {
        options.push(commandLineOptions[key]);
      }
    }
  }
  
  return options;
}

//---------------------------------------------------------------------
// Model file functions
//---------------------------------------------------------------------

/**
 * Gets the extension of a file.
 *
 * @param {string} filePath The path to the file.
 * @returns {string} The file extension minus the '.'.
 */
function getExtension(filePath) {
  return filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
}

/**
 * Gets the filename minus the extension.
 *
 * @param {string} filePath The path to the file.
 * @returns {string} The file name minus the extension.
 */
function getFileName(filePath) {
  var extensionIndex = filePath.lastIndexOf('.');
  var directoryIndex = filePath.lastIndexOf(path.sep) + 1;
  
  return filePath.slice(directoryIndex, extensionIndex);
}

/**
 * Determines if the path refers to an importable model format.
 *
 * @param {string} filePath The path to the file.
 * @returns {boolean} true if the path references an importable model file; false otherwise.
 */
function isModelFile(filePath) {
  return getExtension(filePath) in inputFormatExtensions;
}

/**
 * Determines the number of importable model files present in the array.
 *
 * @param Array<string> filePaths The paths to the files.
 * @returns {number} The number of importable model files present in the array.
 */
function getNumModelFiles(filePaths) {
  var numFiles = filePaths.length;
  var modelFiles = 0;
  
  for (var i = 0; i < numFiles; ++i) {
    if (isModelFile(filePaths[i])) {
      modelFiles++;
    }
  }
  
  return modelFiles;
}

/**
 * Determines the index of the importable model file.
 *
 * @param Array<string> filePaths The paths to the files.
 * @returns {number} The index of the first model file encountered.
 */
function getModelFileIndex(filePaths) {
  var numFiles = filePaths.length;
  
  for (var i = 0; i < numFiles; ++i) {
    if (isModelFile(filePaths[i])) {
      return i;
    }
  }
  
  return -1;
}

//---------------------------------------------------------------------
// File functions
//---------------------------------------------------------------------

/**
 * Copies a group of files to a new location.
 *
 * @param Array<string> tempPaths The temporary paths to the files.
 * @param Array<string> fileNames The actual names of the files.
 * @param string copyTo The path to place the files in.
 * @param index The index of the file to copy.
 * @param {function(string)} callback The callback to use when either an error occurs or copying is complete.
 */
function copyFilesTo(tempPaths, fileNames, copyTo, index, callback) {
  if (index < tempPaths.length) {
    var tempPath = tempPaths[index];
    var copyPath = path.join(copyTo, fileNames[index]);
    
    console.log(index + ': Moving ' + tempPaths + ' to ' + copyPath);
    
    fs.rename(tempPath, copyPath, function (error) {
      if (!error) {
        copyFilesTo(tempPaths, fileNames, copyTo, index + 1, callback);
      } else {
        callback(error);
      }
    });
  } else {
    callback();
  }
}

//---------------------------------------------------------------------
// HTTP Response functions
//---------------------------------------------------------------------

/**
 * Writes an error response to the client.
 *
 * @param {HttpResponse} res The HTTP response to write to.
 * @param {string} error The error to send.
 */
function writeError(res, error) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write('{ "error:" "' + error + '" }');
  res.end();
}

//---------------------------------------------------------------------
// Module exports
//---------------------------------------------------------------------
  
/**
 * Convert model files.
 */
exports.convert = function(req, res){
  var modelFiles = req.files.model;
  var fileNames = new Array();
  var tempPaths = new Array();
  var numFilesReceived;
  
  // See how many files we're dealing with
  if (modelFiles instanceof Array) {
    numFilesReceived = modelFiles.length;
    
    for (var i = 0; i < numFilesReceived; ++i) {
      fileNames.push(modelFiles[i].name);
      tempPaths.push(modelFiles[i].path);
    }
  } else if (modelFiles.size != 0) {
    numFilesReceived = 1;

    fileNames.push(modelFiles.name);
    tempPaths.push(modelFiles.path);
  } else {
    writeError(res, 'No files present');
    return;
  }

  // Verify that a single model file is present
  var numModelFiles = getNumModelFiles(fileNames);
  
  if (numModelFiles != 1) {
    writeError(res, (numModelFiles == 0) ? 'No model files present': 'Multiple model files present');
    return;
  }
  
  // Verify the model format
  // Set default if necessary
  var outputType;
  var body = req.body;
  
  if ((!body.output) || !(body.output in outputFormatExtensions)) {
    outputType = 'mesh';
  } else {
    outputType = body.output;
  }
  
  // Get the model to convert
  var modelFileIndex = getModelFileIndex(fileNames);
  var modelFileName = fileNames[modelFileIndex];
  var inputType = getExtension(modelFileName);
  var outputFileName = getFileName(modelFileName) + '.' + outputType;
  
  console.log('Converting ' + modelFileName + ' of type ' + inputFormatExtensions[inputType]
            + ' to ' + outputFileName + ' of type ' + outputFormatExtensions[outputType]);
            
  // Create a temporary directory to put the files
  // Use the temporary file name so the directory name is unique
  var tempModelPath = tempPaths[modelFileIndex];
  var tempModelFileName = getFileName(tempModelPath);
  var tempDirPath = path.join(tempModelPath.slice(0, tempModelPath.lastIndexOf(path.sep)), tempModelFileName);
  
  console.log('Creating directory' + tempDirPath);
  
  fs.mkdir(tempDirPath, '0777', function (mkdirError) {
    if (!mkdirError) {
      // Copy all the files over
      console.log(tempPaths);
      copyFilesTo(tempPaths, fileNames, tempDirPath, 0, function (copyError) {
        if (!copyError) {
          // Call the assimp process
          var arguments = new Array();
          var outputPath = path.join(tempDirPath, outputFileName);
          arguments.push('export');
          arguments.push(path.join(tempDirPath, modelFileName));
          arguments.push(outputPath);
          arguments = arguments.concat(getAssimpOptions(body));
          
          console.log('Calling assimp with the following arguments\n' + arguments.join(' '));
          
          var assimp = process.spawn(assimpPath, arguments);
          
          assimp.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
          });

          assimp.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
          });

          assimp.on('exit', function (code) {
            if (code == 0) {
              console.log('Conversion successful! Sending ' + outputPath);
              res.sendfile(outputPath);
            } else {
              writeError(res, 'An error occurred during conversion');
            }
          });
        } else {
          writeError(res, copyError);
        }
      });
    } else {
      writeError(res, mkdirError);
    }
  });
}
