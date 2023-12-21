/**
 *	animEngine.js
 *	2017-12
 *	Motor de animacion
 *	
 *	Inicializa el canvas ajustando la pantalla
 *	Carga el json source
 *	Recorre el json source inicializando cada objeto (escenas, objetos, animaciones, audios, eventos)
 *
 *	Cómo usar?
 *		window.onload = function(e){
 *			anim = new animEngine();
 *			anim.initialize("name_py");
 *		}
 *		//El motor hace el resto...
 */


////////////////////////////////////////////
////		GLOBAL VAR SECTION			////
////////////////////////////////////////////

var anim; 		// objeto principal. Lo inicializa el cliente (HTML)
var thisAnimEngine; // Corresponde al 'this' del objeto animEngine
var canvasDOM;	// objeto canvas DOM
var GLOBAL_CANVAS_STATE = new CanvasState();//variable global para la gesti�n del objeto canvas JS
var folderPjName;




















////////////////////////////////////////////
////		CONSTANTS SECTION			////
////////////////////////////////////////////


var FRAMES_PER_SECOND_CANVAS = 60;

var EnumProjectType = {//solo informativo por ahora
	STORY		: 1,
	ADS 		: 2,
	BROCHURE	: 3
}

var EnumObjectClasses = {
	INTERACTIVE_OBJECT	: 1,
	STATIC_OBJECT		: 2//no implementado a�n
}

var EnumObjectTypes = {
	IMAGE 	: 1,
	RECT 	: 2,
	TEXT 	: 3,//no implementado a�n
	ARC 	: 4,//no implementado a�n
	PATH 	: 5,//no implementado a�n
	LINE 	: 6,//no implementado a�n
	CIRCLE 	: 7//no implementado a�n
}

var EnumAnimationsTypes = {
	MOVE : 1,
	ROTATE : 2,
	SCALE : 3,
	ALPHA : 4
}

var EnumAnimationsSubTypes = {
	ROTATION_TO_ANGLE : 1,
	ROTATION_ANGLE_PER_SECOND : 2
}

var EnumAnimationsTrigger = {
	ON_START_SCENE			: 1,
	ON_CLIC 				: 2,//no implementado a�n
	ON_ANIMATION_START 		: 3,
	ON_ANIMATION_FINISH 	: 4
}

var EnumClicEventTypes = {
	ON_CLIC_START_ANIMATION	: 1,
	ON_CLIC_PREVIEW_SCENE	: 2,
	ON_CLIC_NEXT_SCENE		: 3,
	ON_CLIC_GO_TO_SCENE		: 4,//no implementado a�n
	ON_CLIC_START_AUDIO		: 5,
	ON_CLIC_INI_FULL_SCREEN	: 6,
	ON_CLIC_END_FULL_SCREEN	: 7,
	ON_CLIC_TOOGLE_FULL_SCREEN: 8
}


var EnumAudiosTrigger = {
	ON_START_SPECIFIC_SCENE	: 1,
	ON_CLIC 				: 2,//no implementado a�n
	ON_AUDIO_START	 		: 3,//no implementado a�n
	ON_AUDIO_FINISH 		: 4,//no implementado a�n
	ON_ANIMATION_START 		: 5,
	ON_ANIMATION_FINISH 	: 6//no implementado a�n
}





































////////////////////////////////////////
////		ENGINE SECTION			////
////////////////////////////////////////

function AnimEngine(){}

AnimEngine.prototype.initialize = function(jsonSourceIn){
	
	thisAnimEngine = this;//Se debe crear esta variable para que el 'this' global pueda ser accedido desde dentro de funciones (en tales casos el 'this' representa la propia funcion y no el global)
	//Inicializa el canvas ajustando la pantalla
	canvasDOM = document.getElementById('c');
	this.initializeScreen();
	
	//Carga el json source desde su URL ( TODO la idea es que esto se realice de otra manera )
	folderPjName = "projects/"+jsonSourceIn;
	let pathFile = folderPjName+"/"+jsonSourceIn+".json";
	loadJSONFromFile(pathFile, function(response) {
		thisAnimEngine.source = JSON.parse(response);
		thisAnimEngine.responseJSONSourceInmutable = response;//Se crea copia inmutale para volver el estado original del source cuando se requiera (ej: cuando cambia de escena)
	});
	
	this.width = canvasDOM.width;
	this.height = canvasDOM.height;
	this.ctx = canvasDOM.getContext('2d');

	this.fps = FRAMES_PER_SECOND_CANVAS;// contants.js
	this.pTime = 0;
	this.mTime = 0;
	this.x = 0;

	//Recorre el json source inicializando cada objeto (escenas, objetos, animaciones, audios, eventos)
	//Pero antes debe intentar validar hasta que el json source se haya cargado
	function checkJSONSource() {
		if (thisAnimEngine.source !== undefined) {
			console.log(">>>>>"+eval(thisAnimEngine.source.type));
			
			thisAnimEngine.initializeScenes();

			thisAnimEngine.hasToInitializeInteractives = true;
			// Re-dibuja el canvas segun el fpsCtrl. 
			var fpsCtrl = new FpsCtrl(thisAnimEngine.fps, function(e) {
				
				if(thisAnimEngine.hasToInitializeInteractives == true){
					thisAnimEngine.initializeInteractives();
				}
				
				thisAnimEngine.draw(e);
				thisAnimEngine.playAudios(e);
			});
			fpsCtrl.start();

		}else{
			setTimeout(checkJSONSource, 500);
		}
	}
	checkJSONSource();
	
}


AnimEngine.prototype.initializeScenes = function() {

	var lScenes = this.source.scenes.length;
	for (var i = 0; i < lScenes; i++) {
		this.initializeScene(i);
	}

}


AnimEngine.prototype.initializeScene = function(specificScene) {
	
	var lScenes = this.source.scenes.length;
	if(specificScene !== undefined && specificScene != null && specificScene < lScenes){//'specificScene' vienen con valor y es v�lida?pintela
		GLOBAL_CANVAS_STATE.deleteObjectsFromScene(specificScene);
		//GLOBAL_CANVAS_STATE.deleteAudios(specificScene);
		thisAnimEngine.source = JSON.parse(thisAnimEngine.responseJSONSourceInmutable);
		initObjects(thisAnimEngine.source,specificScene);
		
		
	}else if(GLOBAL_CANVAS_STATE.isNewScene==true){//la escena es nueva?pintela:nada
		GLOBAL_CANVAS_STATE.deleteObjectsFromScene(GLOBAL_CANVAS_STATE.currentScene );
		
		thisAnimEngine.source = JSON.parse(thisAnimEngine.responseJSONSourceInmutable);
		initObjects(thisAnimEngine.source,GLOBAL_CANVAS_STATE.currentScene);

		GLOBAL_CANVAS_STATE.deleteAudios(specificScene);
		this.initAudios();

		
		GLOBAL_CANVAS_STATE.isNewScene=false;
	}
	
	function initObjects(source,numScene){
		var lObjects;
		if(source.scenes[numScene]){//Se valida que ya se hayan cargado los objetos de la escena
		 	lObjects = source.scenes[numScene].objects.length;
		}
		for (var j = 0; j < lObjects; j++) {
			if(eval(source.scenes[numScene].objects[j].objectClass) == EnumObjectClasses.INTERACTIVE_OBJECT){
				var obj = new InteractiveObject(source.scenes[numScene].objects[j]);
				GLOBAL_CANVAS_STATE.addObjectToScene(source.scenes[numScene].numScene, obj);
			}else if(eval(source.scenes[numScene].objects[j].objectClass) == EnumObjectClasses.STATIC_OBJECT){
				//TODO
			}
		}
	}
	
}


AnimEngine.prototype.initAudios = function() {

	var lAudios = this.source.audios.length;
	for (var j = 0; j < lAudios; j++) {
		GLOBAL_CANVAS_STATE.addAudio(this.source.audios[j]);
	}
	
}


AnimEngine.prototype.initializeInteractives = function() {
	this.events = new MouseEvent(canvasDOM,GLOBAL_CANVAS_STATE.scenes,GLOBAL_CANVAS_STATE.currentScene);//MouseEvents.js
	this.events.start();
	this.adminAnimations = new AdminAnimations(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene]);//AdminAnimations.js
	this.adminSounds = new AdminSounds();//AdminSounds.js
	this.hasToInitializeInteractives = false;
}



AnimEngine.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.width, this.height);
}


AnimEngine.prototype.draw = function(e) {
	this.clear();
	this.paintInfo(e);
	
	this.initializeScene();
		
	// Dibuja todos los objetos
	var l = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene].length;
	for (var i = 0; i < l; i++) {
		this.ctx.save();
		GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].updateParamsAnimated(e,this.adminAnimations);//InteractiveObject.js
		GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].draw(this.ctx);//InteractiveObject.js
		this.ctx.restore();
	}
	
}

AnimEngine.prototype.playAudios = function(e) {
	
	var l = GLOBAL_CANVAS_STATE.audios.length;
	for (var i = 0; i < l; i++) {
		this.adminSounds.start(e,i);
	}
	
}



//TODO Borrar despues
AnimEngine.prototype.paintInfo = function(e) {
	//this.ctx.fillText("FPS: " + this.fps + " Frame: " + e.frame + " Time: " + (e.time - this.pTime).toFixed(1), 4, 30);
	//console.log("FPS: " + this.fps + ", e.time: "+e.time+", mTime:"+this.mTime+", pTime:"+this.pTime + ", Time: " +(e.time - this.pTime).toFixed(1));
}






































////////////////////////////////////
////	CANVAS STATE SECTION	////
////////////////////////////////////

function CanvasState() {
	this.scenes = [];
	this.currentScene = 0;
	this.isNewScene = true;
	
	this.audios = [];
}

CanvasState.prototype.addObjectToScene = function(numScene,object) {
	while(this.scenes[numScene] === undefined || this.scenes[numScene] === null && this.scenes.length <= numScene){
		var objects = [];
		this.scenes.push(objects);
	}
	this.scenes[numScene].push(object);
}

CanvasState.prototype.deleteObjectsFromScene = function(numScene) {
	if(this.scenes[numScene] !== undefined && this.scenes[numScene] !== null){
		this.scenes[numScene] = [];
	}
}

CanvasState.prototype.deleteAudios = function() {
	if(this.audios!=undefined && this.audios.length!=undefined){
		for(var i=0;i<this.audios.length;i++){
			this.audios[i].objAudio.pause();
			this.audios[i].objAudio.currentTime = 0;
		}
	}
	this.audios = [];
}

CanvasState.prototype.getNumSceneByID = function(idScene){
	for(var i=0;i<thisAnimEngine.source.scenes.length;i++){
		if(thisAnimEngine.source.scenes[i].id == idScene){
			return thisAnimEngine.source.scenes[i].numScene;
		}
	}
	return null;
}

CanvasState.prototype.addAudio = function(audio) {
	this.audios.push(audio);
}








































////////////////////////////////////////
////	INTERACTIVE OBJECT SECTION	////
////////////////////////////////////////

function InteractiveObject(params){
	this.xDef			= validateDefaultValue(params, params.xDef, 0, false);//utils.js
	this.yDef 			= validateDefaultValue(params, params.yDef, 0, false);//utils.js
	this.wDef			= validateDefaultValue(params, params.wDef, 0, true);//utils.js
	this.hDef			= validateDefaultValue(params, params.hDef, 0, true);//utils.js
	this.degreesDef		= validateDefaultValue(params, params.degrees, 0, false);//utils.js
	this.alphaDef		= validateDefaultValue(params, params.alpha, 1, false);//utils.js
	
	this.x 				= validateDefaultValue(params, params.xDef, 0, false);//utils.js
	this.y 				= validateDefaultValue(params, params.yDef, 0, false);//utils.js
	this.w 				= validateDefaultValue(params, params.wDef, 0, true);//utils.js
	this.h 				= validateDefaultValue(params, params.hDef, 0, true);//utils.js
	this.degrees		= validateDefaultValue(params, params.degrees, 0, false);//utils.js
	this.alpha			= validateDefaultValue(params, params.alpha, 1, false);//utils.js
	
	this.imageSrc 		= validateDefaultValue(params, params.imageSrc, null, false);//utils.js
	if(this.imageSrc !== null){
		var image = new Image();
		image.src = folderPjName+"/"+this.imageSrc;
		this.img = image;
	}
	
	this.objectType 	= validateDefaultValue(params, params.objectType, EnumObjectTypes.RECT, false);//utils.js
	this.fillColor 		= validateDefaultValue(params, params.fillColor, 'gray', false);//utils.js
	this.strokeColor 	= validateDefaultValue(params, params.strokeColor, this.fillColor, false);//utils.js
	this.lineWidth		= validateDefaultValue(params, params.lineWidth, '0', false);//utils.js

	this.text			= validateDefaultValue(params, params.text, '', false);//utils.js
	this.fontSizeDef	= validateDefaultValue(params, params.fontSize, 10, false);//utils.js
	this.fontSize		= validateDefaultValue(params, params.fontSize, 10, false);//utils.js
	this.fontFamily		= validateDefaultValue(params, params.fontFamily, 'Sans-serif', false);//utils.js
	this.textAlign		= validateDefaultValue(params, params.textAlign, 'left', false);//utils.js
	
	this.animations 	= validateDefaultValue(params, params.animations, null, false);//utils.js
	this.onClic		 	= validateDefaultValue(params, params.onClic, null, false);//utils.js
}


/**
 *	Funci�n que actualiza los parametros de los objetos seg�n la animaci�n asociada
 *	Se llama por cada re-pintado del canvas
 *	@method updateParamsAnimated
 *	@param {Event} e evento de control del tiempo (fpsCtrl.js)
 */
InteractiveObject.prototype.updateParamsAnimated = function(e,adminAnimations) {
	
	//Objeto interactivo sin animaciones
	if(this.animations === undefined || this.animations === null || this.animations.length==0){
		return;
	}
	
	//tiempoGeneral
	this.timeFpsCtrl = e.time;
	
	//Recorrer las animaciones (MOVE, ROTATE, SCALE, ...), validar si deben estarse animando y de ser as� animarlas 
	var l = this.animations.length;
	for (var i = 0; i < l; i++) {
		
		if(eval(this.animations[i].type) !== undefined  && eval(this.animations[i].type) !== null){
			
			var adminAnimations = new AdminAnimations(this,i);//AdminAnimations.js
			adminAnimations.start(this,i);
			
		}
		
	}
}


/**
 *	Funci�n que toma el objeto y lo pinta en el contexto del canvas seg�n sus propiedades
 *	Se llama por cada re-pintado del canvas
 *	@method draw
 *	@param {Context} ctx contexto del Canvas
 */
InteractiveObject.prototype.draw = function(ctx) {
	
	var objectCenterX = (parseInt(thisAnimEngine.getPosObjectFromPercentX(this.x))-(parseInt(thisAnimEngine.getObjectWidthFromPercentX(this.w))/2));
	var objectCenterY = (parseInt(thisAnimEngine.getPosObjectFromPercentY(this.y))-(parseInt(thisAnimEngine.getObjectHeightFromPercentY(this.h))/2));
	
	this.rotate(ctx, this.degrees);//utilidad para rotar objeto
	this.globalAlpha(ctx, this.alpha);//utilidad para opacar objeto
	
	if( eval(this.objectType) == EnumObjectTypes.IMAGE ){
		//console.log("image");
		ctx.drawImage(
			this.img,
			objectCenterX,
			objectCenterY,
			thisAnimEngine.getObjectWidthFromPercentX(this.w),
			thisAnimEngine.getObjectHeightFromPercentY(this.h)
		);
		
	}else if( eval(this.objectType) == EnumObjectTypes.RECT ){
		//console.log("rect");
		
		ctx.fillStyle = this.fillColor;
		ctx.strokeStyle = this.strokeColor;
		
		ctx.beginPath();
	
		ctx.lineWidth = this.lineWidth;
		
		ctx.rect(
			objectCenterX,
			objectCenterY,
			thisAnimEngine.getObjectWidthFromPercentX(this.w),
			thisAnimEngine.getObjectHeightFromPercentY(this.h)
		);

		if(this.lineWidth != 0){
			ctx.strokeRect(
				objectCenterX,
				objectCenterY,
				thisAnimEngine.getObjectWidthFromPercentX(this.w),
				thisAnimEngine.getObjectHeightFromPercentY(this.h)
			);
		}
		
		ctx.fill();

	}else if( eval(this.objectType) == EnumObjectTypes.PATH ){//TODO
		//console.log("line");
		ctx.beginPath();
	    ctx.moveTo(75, 50);
	    ctx.lineTo(100, 75);
	    ctx.lineTo(100, 25);
	    ctx.fill();
		
	}else if( eval(this.objectType) == EnumObjectTypes.TEXT ){
		ctx.textAlign = this.textAlign;
		ctx.font = thisAnimEngine.getFontSizeFromPercentX(this.fontSize) + "px " + this.fontFamily; //forma algo como "10px Sans-Serif"
	    
	    this.w = thisAnimEngine.getPercentXFromObjectWidth(ctx.measureText(this.text).width);// TODO Crear metodos incluyendo calculo para height (buscar)
		this.h = this.fontSize * 0.5;//Calculo aproximado pero efectivo
		
		let lineheight = thisAnimEngine.getObjectHeightFromPercentY(this.h)*1;
		var lines = this.text.split('\n');
		
		ctx.strokeStyle = this.strokeColor;
	    if(this.lineWidth != 0){
	    	ctx.lineWidth = this.lineWidth;
			for (var i = 0; i<lines.length; i++){
				ctx.strokeText(
					lines[i],
					objectCenterX,
					objectCenterY+(thisAnimEngine.getObjectHeightFromPercentY(this.h) + (i*lineheight))
				);
			}
	    }
	    
	    ctx.fillStyle = this.fillColor;
		for (var i = 0; i<lines.length; i++){
			ctx.fillText(
				lines[i],
				objectCenterX,
				objectCenterY+(thisAnimEngine.getObjectHeightFromPercentY(this.h) + (i*lineheight))
			);
		}
	    


	}else{
		//console.log("otro");
	}
	
	
}

InteractiveObject.prototype.rotate = function(ctx, degrees) {
	ctx.translate( thisAnimEngine.getObjectWidthFromPercentX(this.x), thisAnimEngine.getObjectHeightFromPercentY(this.y) );//por defecto rota en (0,0), pero con ajuste en draw (objectCenterX y objectCenterY) todo se hace en el centro
	ctx.rotate(degrees * Math.PI / 180);
	ctx.translate( -thisAnimEngine.getObjectWidthFromPercentX(this.x) , -thisAnimEngine.getObjectHeightFromPercentY(this.y) );
}


InteractiveObject.prototype.globalAlpha = function(ctx, alpha) {
	ctx.globalAlpha = alpha;
}























////////////////////////////////////////
////	ADMIN ANIMATION SECTION		////
////////////////////////////////////////

function AdminAnimations(){}


AdminAnimations.prototype.start = function(obj,i) {
	this.obj = obj;	//objeto IteractiveObject
	this.i = i;		//indice animaci�n del objeto en curso 
	this.anim = null;
	
	if(eval(obj.animations[i].type) == EnumAnimationsTypes.MOVE){
		this.anim = new MoveAnimation(obj,i);
	}else if(eval(obj.animations[i].type) == EnumAnimationsTypes.ROTATE){
		this.anim = new RotateAnimation(obj,i);
	}else if(eval(obj.animations[i].type) == EnumAnimationsTypes.SCALE){
		this.anim = new ScaleAnimation(obj,i);
	}else if(eval(obj.animations[i].type) == EnumAnimationsTypes.ALPHA){
		this.anim = new AlphaAnimation(obj,i);
	}else{
		//Animacion no parametrizada
		console.log("Animacion no parametrizada");
	}
	

	//Asegurar variables iniciales (m�nimas) y crear variables de control sobre la misma animaci�n
	//Se debe hacer solo la primera vez, entonces se valida con cualquier variable sin crear a�n (pod�a ser cualquiera, se tom�: isAnimating)
	if(obj.animations[i].params.isAnimating === undefined || obj.animations[i].params.isAnimating === null){
	
		if(this.anim !== null){
			this.anim.initialize();						//Ver cada uno de los scripts de animaci�n MoveAnimation.js, RotateAnimation.js...
			this.anim.initializeControlVars();			//Ver cada uno de los scripts de animaci�n MoveAnimation.js, RotateAnimation.js...
			
			//control
			obj.animations[i].params.isAnimating 				= false;
			obj.animations[i].params.startTime 					= null;
			obj.animations[i].params.timeOfAnimation 			= 0;//tiempo transcurrido desde el inicio de la animaci�n. Sirve para calculo de posiciones
			obj.animations[i].params.isAnimFinished 			= false;
			obj.animations[i].params.isAnimWaitingForFinish 	= true;//Bandera para animaci�n 'ON_ANIMATION_FINISH', ya que esa anim estar� siempre finalizada y animar�a esta siempre
			
			//console.log("INI"+getStrJSON(obj.animations[i].params));
		}
		
	}
	
	//validar si la animaci�n ya debe iniciar
	this.validateIfStartAnimation();
	
	//Si la bandera esta activa inicie animaci�n
	if(obj.animations[i].params.isAnimating == true){ //TODO incluir "&& obj.animations[i].params.isAnimFinished == false" ????
	
		//Se inicializa solo la primera vez que entra
		if (obj.animations[i].params.startTime === null){
			obj.animations[i].params.startTime = obj.timeFpsCtrl;
		}
		
		//tiempo transcurrido desde el inicio de la animaci�n
		obj.animations[i].params.timeOfAnimation = obj.timeFpsCtrl - obj.animations[i].params.startTime;
		
		//Si existe retraso salir: no iniciar animaci�n hasta que el tiempo transcurrido supere el delay
		if(obj.animations[i].params.delay > obj.animations[i].params.timeOfAnimation){
			return;
		}
		
				
		this.anim.initializeControlVars();	//Ver cada uno de los scripts de animaci�n MoveAnimation.js, RotateAnimation.js...
											//Se recalculan por si hay otra animaci�n del mismo tipo (MOVE, SCALE, ...) para el mismo objeto 
		this.anim.start();					//Ver cada uno de los scripts de animaci�n MoveAnimation.js, RotateAnimation.js...
		
		
	}
	
}



AdminAnimations.prototype.validateIfStartAnimation = function() {
	obj = this.obj;
	i = this.i;
	
	for(var t = 0; t < obj.animations[i].triggers.length; t++){
		
		//Si el trigger es ON_START_SCENE entonces inicie de una vez
		if(eval(obj.animations[i].triggers[t].type) == EnumAnimationsTrigger.ON_START_SCENE && obj.animations[i].params.isAnimFinished == false){
			obj.animations[i].params.isAnimating = true;
		}
		
		//Si el trigger es ON_ANIMATION_START entonces validar si la animaci�n ya inici�
		if(eval(obj.animations[i].triggers[t].type) == EnumAnimationsTrigger.ON_ANIMATION_START && obj.animations[i].params.isAnimFinished == false){
			
			//id de adnimaci�n a buscar
			var idAnimationTrigger = obj.animations[i].triggers[t].params.idAnimationTrigger;
			
			//Se recorren los objetos, y por cada uno todas sus animaciones buscando el id
			if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== undefined && GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== null){
				var l = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene].length;
				for (var j=0; j<l; j++) {
					if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations != null){ //se asegur� valor nulo si no tiene 'animations' en InteractiveObject.js
						
						//Se recorren las animaciones del objeto buscando el id
						var lAnims = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations.length;
						for (var k=0; k<lAnims; k++) {
							if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].id == idAnimationTrigger){
								
								//Si se encontr� el objeto revisar si ya inici�
								if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.isAnimating == true){
								
									//Si existe retraso salir: no iniciar animaci�n hasta que el tiempo transcurrido supere el delay
									if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.delay > GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.timeOfAnimation){
										return;
									}
									
									obj.animations[i].params.isAnimating = true;
								}
								
								//forzar finalizar bucles
								return;
							}
						}
						
					}
				}
			}
		}
		
		
		//Si el trigger es ON_ANIMATION_FINISH entonces validar si la animaci�n ya finaliz�
		if(eval(obj.animations[i].triggers[t].type) == EnumAnimationsTrigger.ON_ANIMATION_FINISH && obj.animations[i].params.isAnimating == false){// && obj.animations[i].params.isAnimFinished == false){
			
			//id de animaci�n a buscar
			var idAnimationTrigger = obj.animations[i].triggers[t].params.idAnimationTrigger;
			
			//Se recorren los objetos, y por cada uno todas sus animaciones buscando el id
			if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== undefined && GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== null){
				var l = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene].length;
				for (var j=0; j<l; j++) {
					if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations != null){ //se asegur� valor nulo si no tiene 'animations' en InteractiveObject.js
						
						//Se recorren las animaciones del objeto buscando el id
						var lAnims = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations.length;
						for (var k=0; k<lAnims; k++) {
							if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].id == idAnimationTrigger){

								//Si se encontr� el objeto trigger entonces:
								
								//1. Actualizar bandera que se activa cuando inicia la animaci�n del objeto trigger, para:
								// * Controlar que no se inicie esta animiaci�n para siempre por que la otra animaci�n simpre esta en 'ON_ANIMATION_FINISH'
								// * Controlar si la animaci�n fue iniciada por otro evento y volvi� a finalizar
								if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.isAnimating == true){
									obj.animations[i].params.isAnimWaitingForFinish = true;
								}

								//2. Revisar si ya finaliz� el objeto trigger
								if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.isAnimFinished == true && obj.animations[i].params.isAnimWaitingForFinish == true){
									
									obj.animations[i].params.isAnimating = true;
									obj.animations[i].params.isAnimFinished = false;
									obj.animations[i].params.startTime = obj.timeFpsCtrl;
									obj.animations[i].params.isAnimWaitingForFinish = false;
									
								}
								
								//forzar finalizar bucles
								return;
							}
						}
						
					}
				}
			}
		}
		
	}
	
}




function MoveAnimation(obj,i){
	this.obj = obj;	//objeto IteractiveObject
	this.i = i;		//indice animaci�n del objeto en curso 
}

MoveAnimation.prototype.initialize = function() {
	obj = this.obj;
	i = this.i;
	
	//minimas
	obj.animations[i].params.toX				= validateDefaultValue(obj.animations[i].params.toX, obj.animations[i].params.toX, obj.xDef, false);//utils.js
	obj.animations[i].params.toY			 	= validateDefaultValue(obj.animations[i].params.toY, obj.animations[i].params.toY, obj.yDef, false);//utils.js
	obj.animations[i].params.duration			= validateDefaultValue(obj.animations[i].params.duration, obj.animations[i].params.duration, 1000, false);//utils.js
	obj.animations[i].params.delay 				= validateDefaultValue(obj.animations[i].params.delay, obj.animations[i].params.delay, 0, false);//utils.js
}

MoveAnimation.prototype.initializeControlVars = function() {
	obj = this.obj;
	i = this.i;
	
	//control
	obj.animations[i].params.XpxPSec 			= ( (obj.animations[i].params.toX - obj.xDef)/obj.animations[i].params.duration ) * 1000;//pixeles por segundo
	obj.animations[i].params.YpxPSec 			= ( (obj.animations[i].params.toY - obj.yDef)/obj.animations[i].params.duration ) * 1000;//pixeles por segundo
}

MoveAnimation.prototype.start = function() {
	obj = this.obj;
	i = this.i;
		
	//calculo de posicion segun tiempo controlado por FpsCtrl.js

	var timeOfAnimationTemp = obj.animations[i].params.timeOfAnimation;

	var xCalc = obj.animations[i].params.XpxPSec * (timeOfAnimationTemp - obj.animations[i].params.delay)/1000;
	var yCalc = obj.animations[i].params.YpxPSec * (timeOfAnimationTemp - obj.animations[i].params.delay)/1000;
	obj.x = obj.xDef + xCalc;
	obj.y = obj.yDef + yCalc;
	console.log(obj.objectType + ", x:"+obj.x + ", y:"+obj.y + ", time: "+ obj.timeFpsCtrl);
	
	if( (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay) >= obj.animations[i].params.duration){
		obj.animations[i].params.isAnimFinished = true;
		obj.animations[i].params.isAnimating = false;
		obj.x = obj.animations[i].params.toX;
		obj.y = obj.animations[i].params.toY;
		obj.xDef = obj.animations[i].params.toX; //ser� el nuevo punto de partida por si existen m�s animaciones
		obj.yDef = obj.animations[i].params.toY; //ser� el nuevo punto de partida por si existen m�s animaciones
		console.log(obj.objectType + ", Animaci�n 'MOVE' finalizada");
		console.log("FINALIZADO CON PARAMETROS: objType:" + obj.objectType + ", indexAnimation:" + i + ", getPosObjectFromPercentX(obj.xDef):"+obj.xDef+ ", getPosObjectFromPercentY(obj.yDef):"+obj.yDef+ "");
	}
	
}






function AlphaAnimation(obj,i){
	this.obj = obj;	//objeto IteractiveObject
	this.i = i;		//indice animaci�n del objeto en curso 
}

AlphaAnimation.prototype.initialize = function() {
	obj = this.obj;
	i = this.i;
	
	//minimas
	obj.animations[i].params.toAlpha			= validateDefaultValue(obj.animations[i].params.toAlpha, obj.animations[i].params.toAlpha, 1, false);//utils.js
	obj.animations[i].params.duration			= validateDefaultValue(obj.animations[i].params.duration, obj.animations[i].params.duration, 1000, false);//utils.js
	obj.animations[i].params.delay 				= validateDefaultValue(obj.animations[i].params.delay, obj.animations[i].params.delay, 0, false);//utils.js
	
}

AlphaAnimation.prototype.initializeControlVars = function() {
	obj = this.obj;
	i = this.i;
	
	//control
	obj.animations[i].params.AlphapxPSec 		= ( (obj.animations[i].params.toAlpha - obj.alphaDef)/obj.animations[i].params.duration ) * 1000;//pixeles por segundo	
}

AlphaAnimation.prototype.start = function() {
	obj = this.obj;
	i = this.i;
	
	//calculo de posicion segun tiempo controlado por FpsCtrl.js
	var alphaCalc = obj.animations[i].params.AlphapxPSec * (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay)/1000;
	obj.alpha = obj.alphaDef + alphaCalc;
	console.log(obj.objectType + ", alpha:"+obj.alpha + ", time: "+ obj.timeFpsCtrl);
	
	if( (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay) >= obj.animations[i].params.duration){
		obj.animations[i].params.isAnimFinished = true;
		obj.animations[i].params.isAnimating = false;
		obj.alpha = obj.animations[i].params.toAlpha;
		obj.alphaDef = obj.animations[i].params.toAlpha; //ser� el nuevo punto de partida por si existen m�s animaciones
		console.log(obj.objectType + ", Animaci�n 'ALPHA' finalizada");
	}
	
}








function RotateAnimation(obj,i){
	this.obj = obj;	//objeto IteractiveObject
	this.i = i;		//indice animaci�n del objeto en curso 
}

RotateAnimation.prototype.initialize = function() {
	obj = this.obj;
	i = this.i;

	//minimas
	obj.animations[i].params.clockWise			= validateDefaultValue(obj.animations[i].params.clockWise, obj.animations[i].params.clockWise, true, false);//utils.js
	obj.animations[i].params.toDegrees			= validateDefaultValue(obj.animations[i].params.toDegrees, obj.animations[i].params.toDegrees, null, false);//utils.js
	obj.animations[i].params.duration			= validateDefaultValue(obj.animations[i].params.duration, obj.animations[i].params.duration, 1000, false);//utils.js
	obj.animations[i].params.delay 				= validateDefaultValue(obj.animations[i].params.delay, obj.animations[i].params.delay, 0, false);//utils.js
}

RotateAnimation.prototype.initializeControlVars = function() {
	obj = this.obj;
	i = this.i;
	
	//control
	obj.animations[i].params.degreesPSec		= validateDefaultValue(obj.animations[i].params.degreesPSec, obj.animations[i].params.degreesPSec, null, false);//utils.js . Esta puede ser inicializada por usuario
}

RotateAnimation.prototype.start = function() {
	obj = this.obj;
	i = this.i;

	//Esta animaci�n tiene posibles 2 subTypeAnimation (excluyentes):
	// * ROTATION_ANGLE_PER_SECOND
	// * ROTATION_TO_ANGLE
	
	//Debe tener asignado por lo menos o toDegrees o degreesPSec, pero no ambos, se soluciona dejando solo degreesPSec.
	var subTypeAnimation;
	if(obj.animations[i].params.toDegrees === null){
		if(obj.animations[i].params.degreesPSec === null){
			console.log("WARN. La animacion 'ROTATE' no especifica toDegrees ni degreesPSec, se asigna degreesPSec=10");
			obj.animations[i].params.degreesPSec == DEGREES_PER_SECOND_DEFAULT;//constants.js
			subTypeAnimation = EnumAnimationsSubTypes.ROTATION_ANGLE_PER_SECOND;
		}else{
			//OK
			subTypeAnimation = EnumAnimationsSubTypes.ROTATION_ANGLE_PER_SECOND;
		}
	}else{
		if(obj.animations[i].params.degreesPSec === null){
			//OK
			subTypeAnimation = EnumAnimationsSubTypes.ROTATION_TO_ANGLE;
			//se calcula un nuevo degreesPSec, esto hace que este if sea false y que presente WARN equivocadamente, pero esta OK
		}else{
			//console.log("WARN. La animacion 'ROTATE' especifica toDegrees y degreesPSec simultaneamente, se conserva toDegrees");
			//obj.animations[i].params.degreesPSec == null;// No se asigna null, se calcula un nuevo degreesPSec
			subTypeAnimation = EnumAnimationsSubTypes.ROTATION_TO_ANGLE;
		}
	}
	
	//Una vez definido el subTypeAnimation se anima
	if(subTypeAnimation == EnumAnimationsSubTypes.ROTATION_ANGLE_PER_SECOND){
		
		//calculo de angulo segun tiempo controlado por FpsCtrl.js
		var degreesCalc = obj.animations[i].params.degreesPSec * (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay)/1000;
		if( obj.animations[i].params.clockWise == true ){
			obj.degrees = obj.degreesDef + degreesCalc;
		}else{
			obj.degrees = obj.degreesDef - degreesCalc;
		}
		
		console.log(obj.objectType + ", subTypeAnimation: ", + subTypeAnimation + ", degrees:"+obj.degrees + ", time: "+ obj.timeFpsCtrl);
		
		//TODO Asignar como valor final el �ngulo calculado, ya que se pasa un poquito... Ejemplo, iniciando en 0, animar a una vel de 90 grados por segundo, durante un segundo deber�a quedar en 90, pero se pasa un poco
		if( (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay) >= obj.animations[i].params.duration ){
			obj.animations[i].params.isAnimFinished = true;
			obj.animations[i].params.isAnimating = false;
			obj.degreesDef = obj.degrees; //ser� el nuevo punto de partida por si existen m�s animaciones
			console.log(obj.objectType + ", Animaci�n 'ROTATE' finalizada");
		}
	
	} else if(subTypeAnimation == EnumAnimationsSubTypes.ROTATION_TO_ANGLE){
		
		//calculo de angulo segun tiempo controlado por FpsCtrl.js
		if( obj.animations[i].params.clockWise == true ){
			obj.animations[i].params.degreesPSec = ( (obj.animations[i].params.toDegrees - obj.degreesDef)/obj.animations[i].params.duration ) * 1000;//grados por segundo
		}else{
			obj.animations[i].params.degreesPSec = ( (360 - obj.animations[i].params.toDegrees - obj.degreesDef)/obj.animations[i].params.duration ) * 1000;//grados por segundo
		}
		
		var degreesCalc = obj.animations[i].params.degreesPSec * (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay)/1000;
		if( obj.animations[i].params.clockWise == true ){
			obj.degrees = obj.degreesDef + degreesCalc;
		}else{
			obj.degrees = (-obj.degreesDef) - degreesCalc;
		}
		console.log(obj.objectType + ", subTypeAnimation: ", + subTypeAnimation + ", degrees:"+obj.degrees + ", time: "+ obj.timeFpsCtrl);
		
		if( (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay) >= obj.animations[i].params.duration ){
			obj.animations[i].params.isAnimFinished = true;
			obj.animations[i].params.isAnimating = false;
			obj.degrees = obj.animations[i].params.toDegrees;
			obj.degreesDef = obj.animations[i].params.toDegrees; //ser� el nuevo punto de partida por si existen m�s animaciones
			console.log(obj.objectType + ", Animaci�n 'ROTATE' finalizada");
		}
	
	}
	
}





function ScaleAnimation(obj,i){
	this.obj = obj;	//objeto IteractiveObject
	this.i = i;		//indice animaci�n del objeto en curso 
}

ScaleAnimation.prototype.initialize = function() {
	obj = this.obj;
	i = this.i;
	
	//minimas
	obj.animations[i].params.toW 				= validateDefaultValue(obj.animations[i].params.toW, obj.animations[i].params.toW, obj.wDef, false);//utils.js
	obj.animations[i].params.toH			 	= validateDefaultValue(obj.animations[i].params.toH, obj.animations[i].params.toH, obj.hDef, false);//utils.js
	obj.animations[i].params.duration			= validateDefaultValue(obj.animations[i].params.duration, obj.animations[i].params.duration, 1000, false);//utils.js
	obj.animations[i].params.delay 				= validateDefaultValue(obj.animations[i].params.delay, obj.animations[i].params.delay, 0, false);//utils.js
}

ScaleAnimation.prototype.initializeControlVars = function() {
	obj = this.obj;
	i = this.i;
	
	//control
	obj.animations[i].params.WpxPSec 			= ( (obj.animations[i].params.toW - obj.wDef)/obj.animations[i].params.duration ) * 1000;//pixeles por segundo
	obj.animations[i].params.HpxPSec 			= ( (obj.animations[i].params.toH - obj.hDef)/obj.animations[i].params.duration ) * 1000;//pixeles por segundo
	obj.animations[i].params.SpxPSec 			= ( (obj.animations[i].params.toFontSize - obj.fontSizeDef)/obj.animations[i].params.duration ) * 1000;//Scale pixeles por segundo (aplica solo para texto)
}

ScaleAnimation.prototype.start = function() {
	obj = this.obj;
	i = this.i;

	if( eval(obj.objectType) == EnumObjectTypes.TEXT ){//los text se escalan con el 'font', no con 'w' y 'h'
		
		//calculo de tama�o segun tiempo controlado por FpsCtrl.js
		var sCalc = obj.animations[i].params.SpxPSec * (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay)/1000;
		obj.fontSize = obj.fontSizeDef + sCalc;
		console.log(obj.objectType + ", s:"+obj.fontSize + "px, time: "+ obj.timeFpsCtrl);

		if( (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay) >= obj.animations[i].params.duration){
			obj.animations[i].params.isAnimFinished = true;
			obj.animations[i].params.isAnimating = false;
			obj.fontSize = obj.animations[i].params.toFontSize;
			obj.fontSizeDef = obj.animations[i].params.toFontSize; //ser� el nuevo punto de partida por si existen m�s animaciones
			console.log(obj.objectType + ", Animaci�n 'SCALE' finalizada");
		}

	}else{
		//calculo de tama�o segun tiempo controlado por FpsCtrl.js
		var wCalc = obj.animations[i].params.WpxPSec * (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay)/1000;
		var hCalc = obj.animations[i].params.HpxPSec * (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay)/1000;
		obj.w = obj.wDef + wCalc;
		obj.h = obj.hDef + hCalc;
		console.log(obj.objectType + ", w:"+obj.w + ", h:"+obj.h + ", time: "+ obj.timeFpsCtrl);
		
		if( (obj.animations[i].params.timeOfAnimation - obj.animations[i].params.delay) >= obj.animations[i].params.duration){
			obj.animations[i].params.isAnimFinished = true;
			obj.animations[i].params.isAnimating = false;
			obj.w = obj.animations[i].params.toW;
			obj.h = obj.animations[i].params.toH;
			obj.wDef = obj.animations[i].params.toW; //ser� el nuevo punto de partida por si existen m�s animaciones
			obj.hDef = obj.animations[i].params.toH; //ser� el nuevo punto de partida por si existen m�s animaciones
			console.log(obj.objectType + ", Animaci�n 'SCALE' finalizada");
		}

	}
	
}



































function MouseEvent(canvas,scenes,currentScene){
	this.canvas = canvas;
}

MouseEvent.prototype.start = function() {
	this.canvas.addEventListener("click", this.mouseClickEvent.bind(this), false);
}

MouseEvent.prototype.mouseClickEvent = function(e){
	//console.log("click!: " + (e.pageX  - e.currentTarget.offsetLeft ) + "," + (e.pageY  - e.currentTarget.offsetTop ));
	var clickX = (e.pageX  - e.currentTarget.offsetLeft );
	var clickY = (e.pageY  - e.currentTarget.offsetTop );
	
	// Recorre todos los objetos
	if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== undefined && GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== null){
		var l = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene].length;
		for (var i = l-1; i >=0; i--) {

			var objectCenterX = (parseInt(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].x)-(parseInt(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].w)/2));
			var objectCenterY = (parseInt(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].y)-(parseInt(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].h)/2));
			
			var objPosX = thisAnimEngine.getPosObjectFromPercentX(objectCenterX);
			var objPosY = thisAnimEngine.getPosObjectFromPercentY(objectCenterY);
			
			var objPosW = thisAnimEngine.getObjectWidthFromPercentX(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].w);
			var objPosH = thisAnimEngine.getObjectHeightFromPercentY(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].h);
			
			var objDegrees = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].degrees;
			
			var isClicked = clickHit([clickX,clickY], [objPosX,objPosY], [objPosW,objPosH], objDegrees);
			
			if(isClicked == true){
				console.log("CLIC: obj: "+i+", type: "+GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i].objectType);
				this.evaluateClic(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][i]);
				return;
			}
			
		}
	}
	
}




MouseEvent.prototype.evaluateClic = function(obj){

		
	//Objeto interactivo sin eventos onClic
	if(obj.onClic === undefined || obj.onClic === null || obj.onClic.length==0){
		return;
	}
	
	//Recorrer los eventos onCLic e iniciarlos todos
	var lOnClics = obj.onClic.length;
	for (var i = 0; i < lOnClics; i++) {
		
		if(eval(obj.onClic[i].type) !== undefined  && eval(obj.onClic[i].type) !== null){
			
			if( eval(obj.onClic[i].type) == EnumClicEventTypes.ON_CLIC_START_ANIMATION){
				
				//id de animaci�n a buscar
				var idAnimation = obj.onClic[i].params.idAnimation;
				
				//Se recorren los objetos, y por cada uno todas sus animaciones buscando el id
				if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== undefined && GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== null){
					var l = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene].length;
					for (var j=0; j<l; j++) {
						if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations != null){ //se asegur� valor nulo si no tiene 'animations' en InteractiveObject.js
							
							//Se recorren las animaciones del objeto buscando el id
							var lAnims = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations.length;
							for (var k=0; k<lAnims; k++) {
								if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].id == idAnimation){
									
									GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.isAnimFinished = false;
									GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.isAnimating = true;
									
									//forzar finalizar bucles, excepto el i: siguiente evento del onCLic
									k=lAnims;
									j=l;
								}
							}
							
						}
					}
				}
				
			}else if( eval(obj.onClic[i].type) == EnumClicEventTypes.ON_CLIC_PREVIEW_SCENE){
				GLOBAL_CANVAS_STATE.currentScene--;
				if(GLOBAL_CANVAS_STATE.currentScene<0){
					GLOBAL_CANVAS_STATE.currentScene = 0;
				}
				GLOBAL_CANVAS_STATE.isNewScene = true;
			}else if( eval(obj.onClic[i].type) == EnumClicEventTypes.ON_CLIC_NEXT_SCENE){
				GLOBAL_CANVAS_STATE.currentScene++;
				if(GLOBAL_CANVAS_STATE.currentScene>=GLOBAL_CANVAS_STATE.scenes.length){
					GLOBAL_CANVAS_STATE.currentScene = GLOBAL_CANVAS_STATE.scenes.length-1;
				}
				GLOBAL_CANVAS_STATE.isNewScene = true;
			}else if( eval(obj.onClic[i].type) == EnumClicEventTypes.ON_CLIC_START_AUDIO){
				//id de audio a buscar
				var idAudio = obj.onClic[i].params.idAudio;
				var l = GLOBAL_CANVAS_STATE.audios.length;
				for (var j=0; j<l; j++) {
					if(GLOBAL_CANVAS_STATE.audios[j].id==idAudio){
						GLOBAL_CANVAS_STATE.audios[j].params.isPlaying 			= true;
						GLOBAL_CANVAS_STATE.audios[j].params.isStarted 			= false;
					}
				}

			}else if( eval(obj.onClic[i].type) == EnumClicEventTypes.ON_CLIC_INI_FULL_SCREEN){
				openFullscreen();
			}else if( eval(obj.onClic[i].type) == EnumClicEventTypes.ON_CLIC_END_FULL_SCREEN){
				closeFullscreen();
			}else if( eval(obj.onClic[i].type) == EnumClicEventTypes.ON_CLIC_TOOGLE_FULL_SCREEN){
				toogleFullscreen();
			}
			
		}
		
	}
		
		
		
	
}


/**
* Find point after rotation around another point by X degrees
*
* @param {Array} point The point to be rotated [X,Y]
* @param {Array} rotationCenterPoint The point that should be rotated around [X,Y]
* @param {Number} degrees The degrees to rotate the point
* @return {Array} Returns point after rotation [X,Y]
*/
function rotatePoint(point_in, rotationCenterPoint, degrees) {

	var point = [point_in[0],point_in[1]];
	// Using radians for this formula
	var radians = degrees * Math.PI / 180;
 
	// Translate the plane on which rotation is occurring.
	// We want to rotate around 0,0. We'll add these back later.
	point[0] -= rotationCenterPoint[0];
	point[1] -= rotationCenterPoint[1];
 
	// Perform the rotation
	var newPoint = [];
	newPoint[0] = point[0] * Math.cos(radians) - point[1] * Math.sin(radians);
	newPoint[1] = point[0] * Math.sin(radians) + point[1] * Math.cos(radians);
 
	// Translate the plane back to where it was.
	newPoint[0] += rotationCenterPoint[0];
	newPoint[1] += rotationCenterPoint[1];
 
	return newPoint;
}


/**
* Find the vertices of a rotating rectangle
*
* @param {Array} position From left, top [X,Y]
* @param {Array} size Lengths [X,Y]
* @param {Number} degrees Degrees rotated around center
* @return {Object} Arrays LT, RT, RB, LB [X,Y]
*/
function findRectVertices(position, size, degrees) {
	var left = position[0];
	var right = position[0] + size[0];
	var top = position[1];
	var bottom = position[1] + size[1];
 
	var center = [ position[0] + size[0]/2, position[1] + size[1]/2 ];
	var LT = [ left, top ];
	var RT = [ right, top ];
	var RB = [ right, bottom ];
	var LB = [ left, bottom ];
	
	var LT_tmp = rotatePoint(LT, center, degrees);
	var RT_tmp = rotatePoint(RT, center, degrees);
	var RB_tmp = rotatePoint(RB, center, degrees);
	var LB_tmp = rotatePoint(LB, center, degrees);
 
	return {
		LT: LT_tmp,
		RT: RT_tmp,
		RB: RB_tmp,
		LB: LB_tmp
	};
}


/**
* Distance formula
*
* @param {Array} p1 First point [X,Y]
* @param {Array} p2 Second point [X,Y]
* @return {Number} Returns distance between points
*/
function distance(p1, p2) {
	return Math.sqrt( Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) );
}
 
 

 /**
* Heron's formula (triangle area)
*
* @param {Number} d1 Distance, side 1
* @param {Number} d2 Distance, side 2
* @param {Number} d3 Distance, side 3
* @return {Number} Returns area of triangle
*/
function triangleArea(d1, d2, d3) {
	// See https://en.wikipedia.org/wiki/Heron's_formula
	var s = (d1 + d2 + d3) / 2;
	return Math.sqrt(s * (s - d1) * (s - d2) * (s - d3));
}






/**
* Determine if a click hit a rotated rectangle
*
* @param {Array} click Click position [X,Y]
* @param {Array} position Rect from left, top [X,Y]
* @param {Array} size Rect size as lengths [X,Y]
* @param {Number} degrees Degrees rotated around center
* @return {Boolean} Returns true if hit, false if miss
*/
function clickHit(click, position, size, degrees) {
	// Find the area of the rectangle
	// Round to avoid small JS math differences
	var rectArea = Math.round(size[0] * size[1]);
 
	// Find the vertices
	var vertices = findRectVertices(position, size, degrees);
 
	// Create an array of the areas of the four triangles
	var triArea = [
		// Click, LT, RT
		triangleArea(
			distance(click, vertices.LT),
			distance(vertices.LT, vertices.RT),
			distance(vertices.RT, click)
		),
		// Click, RT, RB
		triangleArea(
			distance(click, vertices.RT),
			distance(vertices.RT, vertices.RB),
			distance(vertices.RB, click)
		),
		// Click, RB, LB
		triangleArea(
			distance(click, vertices.RB),
			distance(vertices.RB, vertices.LB),
			distance(vertices.LB, click)
		),
		// Click, LB, LT
		triangleArea(
			distance(click, vertices.LB),
			distance(vertices.LB, vertices.LT),
			distance(vertices.LT, click)
		)
	];
 
	// Reduce this array with a sum function
	// Round to avoid small JS math differences
	triArea = Math.round( triArea[0] + triArea[1] +triArea[2] + triArea[3] );
 
	// Finally do that simple thing we visualized earlier
	if (triArea > rectArea) {
		return false;
	}
	return true;
}












































function AdminSounds(){
	
}

AdminSounds.prototype.start = function(e,i) {

	if(GLOBAL_CANVAS_STATE.audios[i]===undefined || GLOBAL_CANVAS_STATE.audios[i].params==undefined){
		return;
	}
	
	//Asegurar variables iniciales (m�nimas) y crear variables de control sobre el mismo audio
	//Se debe hacer solo la primera vez, entonces se valida con cualquier variable sin crear a�n (pod�a ser cualquiera, se tom�: isPlaying)
	if(GLOBAL_CANVAS_STATE.audios[i].params.isPlaying === undefined || GLOBAL_CANVAS_STATE.audios[i].params.isPlaying === null){
		GLOBAL_CANVAS_STATE.audios[i].params.isPlaying 			= false;
		//GLOBAL_CANVAS_STATE.audios[i].params.isPlayFinished 	= false;//se compensa con atributo audio.ended
		GLOBAL_CANVAS_STATE.audios[i].params.isStarted 			= false;
		
		var objAudio = new Audio( folderPjName+"/"+GLOBAL_CANVAS_STATE.audios[i].params.src);
		objAudio.loop = GLOBAL_CANVAS_STATE.audios[i].params.loop;
		objAudio.volume = GLOBAL_CANVAS_STATE.audios[i].params.volume;
		objAudio.load();
		GLOBAL_CANVAS_STATE.audios[i].objAudio			= objAudio;
		
	}
	
	this.validateIfPlayAudios(i);
	
	if(GLOBAL_CANVAS_STATE.audios[i].params.isPlaying == true){
	
		if(GLOBAL_CANVAS_STATE.audios[i].params.isStarted == false){
			
			GLOBAL_CANVAS_STATE.audios[i].objAudio.play();
			
			GLOBAL_CANVAS_STATE.audios[i].params.isStarted = true;
		}
		
		if(GLOBAL_CANVAS_STATE.audios[i].objAudio.currentTime < GLOBAL_CANVAS_STATE.audios[i].objAudio.duration ){
			//el audio se esta reproduciendo <-> isPlaying = true
		}
		
	}
	
}

AdminSounds.prototype.validateIfPlayAudios = function(i) {

	for(var t = 0; t < GLOBAL_CANVAS_STATE.audios[i].triggers.length; t++){
		
		if(eval(GLOBAL_CANVAS_STATE.audios[i].triggers[t].type) == EnumAudiosTrigger.ON_START_SPECIFIC_SCENE && GLOBAL_CANVAS_STATE.audios[i].objAudio.ended == false){
			//var idScene_ite = GLOBAL_CANVAS_STATE.audios[i].triggers[t].params.idScene;
			//if(GLOBAL_CANVAS_STATE.getNumSceneByID(idScene_ite) == GLOBAL_CANVAS_STATE.currentScene){
				//GLOBAL_CANVAS_STATE.audios[i].params.isPlaying = true;
				//return;
			//}

			//id de la escena a validar
			let idScene_ite = GLOBAL_CANVAS_STATE.audios[i].triggers[t].params.idScene;
			let numScene_ite = GLOBAL_CANVAS_STATE.getNumSceneByID(idScene_ite);
			if(numScene_ite == GLOBAL_CANVAS_STATE.currentScene){
				GLOBAL_CANVAS_STATE.audios[i].params.isPlaying = true;
				return;
			}
		}

		if(eval(GLOBAL_CANVAS_STATE.audios[i].triggers[t].type) == EnumAudiosTrigger.ON_ANIMATION_START){
			//id de la animacion a buscar
			let idAnimation = GLOBAL_CANVAS_STATE.audios[i].triggers[t].params.idAnimation;

			//Se recorren los objetos, y por cada uno todas sus animaciones buscando el id
			if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== undefined && GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene] !== null){
				var l = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene].length;
				for (var j=0; j<l; j++) {
					if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations != null){//se asegur� valor nulo si no tiene 'animations' en InteractiveObject.js
						
						//Se recorren las animaciones del objeto buscando el id
						var lAnims = GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations.length;
						for (var k=0; k<lAnims; k++) {
							if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].id == idAnimation){
								
								if(GLOBAL_CANVAS_STATE.scenes[GLOBAL_CANVAS_STATE.currentScene][j].animations[k].params.isAnimating == true){
									GLOBAL_CANVAS_STATE.audios[j].params.isPlaying 			= true;
									GLOBAL_CANVAS_STATE.audios[j].params.isStarted 			= false;
								}

								//forzar finalizar bucles, excepto el t: siguiente trigger del audio
								k=lAnims;
								j=l;
							}
						}
						
					}
				}
			}
		}
		
	}
	
	
}












































////////////////////////////////////////
////		SCREEN SECTION			////
////////////////////////////////////////


AnimEngine.prototype.initializeScreen = function(){

	let w = window,
		d = document,
		e = d.documentElement,
		g = d.getElementsByTagName('body')[0],
		x = w.innerWidth || e.clientWidth || g.clientWidth,
		y = w.innerHeight|| e.clientHeight|| g.clientHeight;

	let browserBarHight = 10;
	let iniX = 393;
	let iniY = 851-browserBarHight;
	let finX = 0;
	let finY = 0;


	let percentToIncrease = 0;
	let percentFinal = 100;
	let error = 1;//posible error al realizar operaciones... acepta un error de 1px
	
	//Intenta incrementar por X
	let difX = x - iniX;
	percentToIncrease = difX*100/iniX;
	finX = iniX + (iniX*percentToIncrease/100);
	finY = iniY + (iniY*percentToIncrease/100);
	
	//Si alg�n valor es mayor al de la pantalla entonces debe incrementar por Y
	if(finX > (x+error) || finY > (y+error)){
		let difY = y - iniY;
		percentToIncrease = difY*100/iniY;
		finX = iniX + (iniX*percentToIncrease/100);
		finY = iniY + (iniY*percentToIncrease/100);
	}
	
	//hasta aqui ser�a pantalla completa, se disminuye si aplica 
	finX = finX*percentFinal/100;
	finY = finY*percentFinal/100;
	
	//Aplicar valores finales a canvas
	canvasDOM.width = finX;
	canvasDOM.height = finY;
}


AnimEngine.prototype.getCanvasWidth = function(){
	return canvasDOM.width;
}

AnimEngine.prototype.getCanvasHeight = function(){ 
	return canvasDOM.height;
}

AnimEngine.prototype.getObjectWidthFromPercentX = function(percent){
	return this.getCanvasWidth()*percent/100;
}

AnimEngine.prototype.getObjectHeightFromPercentY = function(percent){
	return this.getCanvasHeight()*percent/100;
}

AnimEngine.prototype.getObjectScaleFromPercentX = function(object, percentFinalWidth){
	var localFinalWidth = this.getCanvasWidth()*percentFinalWidth/100;
	var localIniWidth = object.getWidth();
	var percentToScale = localFinalWidth*100/localIniWidth;
	var numberToScale = (percentToScale/100);
	return numberToScale;
}

AnimEngine.prototype.getObjectScaleFromPercentY = function(object, percentFinalHeight){
	var localFinalHeight = getCanvasHeight()*percentFinalHeight/100;
	var localIniHeight = object.getHeight();
	var percentToScale = localFinalHeight*100/localIniHeight;
	var numberToScale = (percentToScale/100);
	return numberToScale;
}

AnimEngine.prototype.getPosCanvasCenterX = function(){
	return this.getCanvasWidth()/2;
}

AnimEngine.prototype.getPosCanvasCenterY = function(){
	return this.getCanvasHeight()/2;
}

AnimEngine.prototype.getPosObjectCenterX = function(object){
	return this.getPosCanvasCenterX() - (object.getWidth()/2);
}

AnimEngine.prototype.getPosObjectCenterY = function(object){
	return this.getPosCanvasCenterY() - (object.getHeight()/2);
}

AnimEngine.prototype.getPosObjectFromPercentX = function(percent){
	return this.getCanvasWidth()*percent/100;
}

AnimEngine.prototype.getPosObjectFromPercentY = function(percent){
	return this.getCanvasHeight()*percent/100;
}



AnimEngine.prototype.getFontSizeFromPercentX = function(percent){//podr�a ser X o Y, no importa
	return this.getCanvasWidth()*percent/100;
}

AnimEngine.prototype.getPercentXFromObjectWidth = function(width){//podr�a ser X o Y, no importa
	return width*100/(this.getCanvasWidth());
}




////////////////////////////////////
////		FPS SECTION			////
////////////////////////////////////

function FpsCtrl(fps, callback) {
	var	delay = 1000 / fps,
		time = null,
		frame = -1,
		tref;

	function loop(timestamp) {
		if (time === null) time = timestamp;
		var seg = Math.floor((timestamp - time) / delay);
		if (seg > frame) {
			frame = seg;
			callback({
				time: timestamp,
				frame: frame
			})
		}
		tref = requestAnimationFrame(loop)
	}

	this.isPlaying = false;
	
	this.frameRate = function(newfps) {
		if (!arguments.length) return fps;
		fps = newfps;
		delay = 1000 / fps;
		frame = -1;
		time = null;
	};
	
	this.start = function() {
		if (!this.isPlaying) {
			this.isPlaying = true;
			tref = requestAnimationFrame(loop);
		}
	};
	
	this.pause = function() {
		if (this.isPlaying) {
			cancelAnimationFrame(tref);
			this.isPlaying = false;
			time = null;
			frame = -1;
		}
	};
	
}






































////////////////////////////////////
////		UTILS SECTION		////
////////////////////////////////////


AnimEngine.prototype.printJSON = function(obj){
	var str = JSON.stringify(obj, null, 2); // spacing level = 2
	console.log(str);
}

AnimEngine.prototype.getStrJSON = function(obj){
	var str = JSON.stringify(obj, null, 2); // spacing level = 2
	return str;
}

AnimEngine.prototype.cloneJSON = function(obj) {
	// basic type deep copy
	if (obj === null || obj === undefined || typeof obj !== 'object')  {
		return obj
	}
	// array deep copy
	if (obj instanceof Array) {
		var cloneA = [];
		for (var i = 0; i < obj.length; ++i) {
			cloneA[i] = cloneJSON(obj[i]);
		}              
		return cloneA;
	}                  
	// object deep copy
	var cloneO = {};   
	for (var i in obj) {
		cloneO[i] = cloneJSON(obj[i]);
	}                  
	return cloneO;
}


/**
 * Cargar un JSON en un archivo como objeto
 * Debe ser usada as�:
 *	
 *	// Call to function with anonymous callback
 *	loadJSON(function(response) {
 *	// Do Something with the response e.g.
 *	//jsonresponse = JSON.parse(response);
 *
 *	// Assuming json data is wrapped in square brackets as Drew suggests
 *	//console.log(jsonresponse[0].name);
 */
function loadJSONFromFile (jsonSource, callback) {

	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open('GET', jsonSource, true);
	xobj.onreadystatechange = function () {
		if (xobj.readyState == 4 && xobj.status == "200") {
			// .open will NOT return a value but simply returns undefined in async mode so use a callback
			callback(xobj.responseText);
		}
	}
	xobj.send(null);

}







/**
 *	Funci�n que asegura un valor controlado a un objeto, as� venga undefined o null
 *	@method validateDefaultValue
 *	@param {Object} obj: 					objeto padre evaluado (diferente de undefined o null). Si no pasa validaci�n se retorna el param 'valueDefault' con un warning
 *	@param {Object} valueExpected:			objeto valor a retornar si el padre es OK. Tambien se eval�a (diferente de undefined o null). Si no pasa validaci�n se retorna el param 'valueDefault'
 *	@param {Object} valueDefault: 			valor a retornar si no se pasan las validaciones
 *	@param {Boolean} mandatoryDifferentOf0: si el 'valueExpected' es OK sirve para validar si el valor debe se != 0 para devolver el 'valueExpected' o sino el 'valueDefault' 
 * 											( sirve para casos especiales, ejemplo: 'w no puede ser 0', no aplicar�a para boolean, string...) asi:
 */
function validateDefaultValue (obj, valueExpected, valueDefault, mandatoryDifferentOf0) {
	if( obj !== undefined && obj !== null ){
		
		if( valueExpected !== undefined && valueExpected !== null ){
			
			if( mandatoryDifferentOf0 !== undefined && mandatoryDifferentOf0 !== null && mandatoryDifferentOf0 == true){
				
				if( valueExpected != 0 ){
					return valueExpected;
				}else{
					return valueDefault;
				}
				
			}else{
				return valueExpected;
			}
			
		}else{
			return valueDefault;
		}
		
	}else{
		console.log("WARN: Objeto raiz nulo o indefinido. Se retorna valorDefault pero con warning");
		return valueDefault;
	}
}


























window.onresize = function() {
    anim.initializeScreen();
};


//Other Utils

//FULL SCREEN
var elem = document.documentElement;
var isFullScreen = false;
function toogleFullscreen(){
	isFullScreen?closeFullscreen():openFullscreen();
}
function openFullscreen() {
	isFullScreen=true;
	if (elem.requestFullscreen) {
		elem.requestFullscreen();
	} else if (elem.webkitRequestFullscreen) { /* Safari */
		elem.webkitRequestFullscreen();
	} else if (elem.msRequestFullscreen) { /* IE11 */
		elem.msRequestFullscreen();
	}
}
function closeFullscreen() {
	isFullScreen=false;
	if (document.exitFullscreen) {
		document.exitFullscreen();
	} else if (document.webkitExitFullscreen) { /* Safari */
		document.webkitExitFullscreen();
	} else if (document.msExitFullscreen) { /* IE11 */
		document.msExitFullscreen();
	}
}


//Fonts
async function loadFonts() {
	const font = new FontFace("myfont", "url(assets/fonts/Bangers-Regular.ttf)", {
	  style: "normal",
	  weight: "400",
	  stretch: "condensed",
	});
	// wait for font to be loaded
	await font.load();
	// add font to document
	document.fonts.add(font);
	// enable font with CSS class
	document.body.classList.add("fonts-loaded");
  }
  