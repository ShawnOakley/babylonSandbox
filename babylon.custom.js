t1;\nvec3 t3=b3*Nx+t2;\nreturn t3;\n}\n#endif",pbrLightFunctions:"\nstruct lightingInfo\n{\nvec3 diffuse;\n#ifdef SPECULARTERM\nvec3 specular;\n#endif\n};\nstruct pointLightingInfo\n{\nvec3 lightOffset;\nfloat lightDistanceSquared;\nfloat attenuation;\n};\nstruct spotLightingInfo\n{\nvec3 lightOffset;\nfloat lightDistanceSquared;\nvec3 directionToLightCenterW;\nfloat attenuation;\n};\nfloat computeDistanceLightFalloff_Standard(vec3 lightOffset,float range)\n{\nreturn max(0.,1.0-length(lightOffset)/range);\n}\nfloat computeDistanceLightFalloff_Physical(float lightDistanceSquared)\n{\nreturn 1.0/((lightDistanceSquared+0.001));\n}\nfloat computeDistanceLightFalloff_GLTF(float lightDistanceSquared,float inverseSquaredRange)\n{\nconst float minDistanceSquared=0.01*0.01;\nfloat lightDistanceFalloff=1.0/(max(lightDistanceSquared,minDistanceSquared));\nfloat factor=lightDistanceSquared*inverseSquaredRange;\nfloat attenuation=clamp(1.0-factor*factor,0.,1.);\nattenuation*=attenuation;\n\nlightDistanceFalloff*=attenuation;\nreturn lightDistanceFalloff;\n}\nfloat computeDistanceLightFalloff(vec3 lightOffset,float lightDistanceSquared,float range,float inverseSquaredRange)\n{ \n#ifdef USEPHYSICALLIGHTFALLOFF\nreturn computeDistanceLightFalloff_Physical(lightDistanceSquared);\n#elif defined(USEGLTFLIGHTFALLOFF)\nreturn computeDistanceLightFalloff_GLTF(lightDistanceSquared,inverseSquaredRange);\n#else\nreturn computeDistanceLightFalloff_Standard(lightOffset,range);\n#endif\n}\nfloat computeDirectionalLightFalloff_Standard(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent)\n{\nfloat falloff=0.0;\nfloat cosAngle=max(0.000000000000001,dot(-lightDirection,directionToLightCenterW));\nif (cosAngle>=cosHalfAngle)\n{\nfalloff=max(0.,pow(cosAngle,exponent));\n}\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff_Physical(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle)\n{\nconst float kMinusLog2ConeAngleIntensityRatio=6.64385618977; \n\n\n\n\n\nfloat concentrationKappa=kMinusLog2ConeAngleIntensityRatio/(1.0-cosHalfAngle);\n\n\nvec4 lightDirectionSpreadSG=vec4(-lightDirection*concentrationKappa,-concentrationKappa);\nfloat falloff=exp2(dot(vec4(directionToLightCenterW,1.0),lightDirectionSpreadSG));\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff_GLTF(vec3 lightDirection,vec3 directionToLightCenterW,float lightAngleScale,float lightAngleOffset)\n{\n\n\n\nfloat cd=dot(-lightDirection,directionToLightCenterW);\nfloat falloff=clamp(cd*lightAngleScale+lightAngleOffset,0.,1.);\n\nfalloff*=falloff;\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent,float lightAngleScale,float lightAngleOffset)\n{\n#ifdef USEPHYSICALLIGHTFALLOFF\nreturn computeDirectionalLightFalloff_Physical(lightDirection,directionToLightCenterW,cosHalfAngle);\n#elif defined(USEGLTFLIGHTFALLOFF)\nreturn computeDirectionalLightFalloff_GLTF(lightDirection,directionToLightCenterW,lightAngleScale,lightAngleOffset);\n#else\nreturn computeDirectionalLightFalloff_Standard(lightDirection,directionToLightCenterW,cosHalfAngle,exponent);\n#endif\n}\npointLightingInfo computePointLightingInfo(vec4 lightData) {\npointLightingInfo result;\nresult.lightOffset=lightData.xyz-vPositionW;\nresult.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);\nreturn result;\n}\nspotLightingInfo computeSpotLightingInfo(vec4 lightData) {\nspotLightingInfo result;\nresult.lightOffset=lightData.xyz-vPositionW;\nresult.directionToLightCenterW=normalize(result.lightOffset);\nresult.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);\nreturn result;\n}\nlightingInfo computePointLighting(pointLightingInfo info,vec3 viewDirectionW,vec3 vNormal,vec3 diffuseColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\nfloat lightDistance=sqrt(info.lightDistanceSquared);\nvec3 lightDirection=normalize(info.lightOffset);\n\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+lightDirection);\nNdotL=clamp(dot(vNormal,lightDirection),0.00000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor*info.attenuation;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor*info.attenuation;\n#endif\nreturn result;\n}\nlightingInfo computeSpotLighting(spotLightingInfo info,vec3 viewDirectionW,vec3 vNormal,vec4 lightDirection,vec3 diffuseColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\n\nfloat lightDistance=sqrt(info.lightDistanceSquared);\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+info.directionToLightCenterW);\nNdotL=clamp(dot(vNormal,info.directionToLightCenterW),0.000000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor*info.attenuation;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor*info.attenuation;\n#endif\nreturn result;\n}\nlightingInfo computeDirectionalLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\nfloat lightDistance=length(-lightData.xyz);\nvec3 lightDirection=normalize(-lightData.xyz);\n\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+lightDirection);\nNdotL=clamp(dot(vNormal,lightDirection),0.00000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor;\n#endif\nreturn result;\n}\nlightingInfo computeHemisphericLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,vec3 groundColor,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\n\n\n\nNdotL=dot(vNormal,lightData.xyz)*0.5+0.5;\nresult.diffuse=mix(groundColor,diffuseColor,NdotL);\n#ifdef SPECULARTERM\n\nvec3 lightVectorW=normalize(lightData.xyz);\nvec3 H=normalize(viewDirectionW+lightVectorW);\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nNdotL=clamp(NdotL,0.000000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor;\n#endif\nreturn result;\n}\nvec3 computeProjectionTextureDiffuseLighting(sampler2D projectionLightSampler,mat4 textureProjectionMatrix){\nvec4 strq=textureProjectionMatrix*vec4(vPositionW,1.0);\nstrq/=strq.w;\nvec3 textureColor=texture2D(projectionLightSampler,strq.xy).rgb;\nreturn toLinearSpace(textureColor);\n}",clipPlaneVertexDeclaration2:"#ifdef CLIPPLANE\nuniform vec4 vClipPlane;\nout float fClipDistance;\n#endif\n#ifdef CLIPPLANE2\nuniform vec4 vClipPlane2;\nout float fClipDistance2;\n#endif\n#ifdef CLIPPLANE3\nuniform vec4 vClipPlane3;\nout float fClipDistance3;\n#endif\n#ifdef CLIPPLANE4\nuniform vec4 vClipPlane4;\nout float fClipDistance4;\n#endif",clipPlaneFragmentDeclaration2:"#ifdef CLIPPLANE\nin float fClipDistance;\n#endif\n#ifdef CLIPPLANE2\nin float fClipDistance2;\n#endif\n#ifdef CLIPPLANE3\nin float fClipDistance3;\n#endif\n#ifdef CLIPPLANE4\nin float fClipDistance4;\n#endif",mrtFragmentDeclaration:"#if __VERSION__>=200\nlayout(location=0) out vec4 glFragData[{X}];\n#endif\n",bones300Declaration:"#if NUM_BONE_INFLUENCERS>0\nuniform mat4 mBones[BonesPerMesh];\nin vec4 matricesIndices;\nin vec4 matricesWeights;\n#if NUM_BONE_INFLUENCERS>4\nin vec4 matricesIndicesExtra;\nin vec4 matricesWeightsExtra;\n#endif\n#endif",instances300Declaration:"#ifdef INSTANCES\nin vec4 world0;\nin vec4 world1;\nin vec4 world2;\nin vec4 world3;\n#else\nuniform mat4 world;\n#endif",kernelBlurFragment:"#ifdef DOF\nfactor=sampleCoC(sampleCoord{X}); \ncomputedWeight=KERNEL_WEIGHT{X}*factor;\nsumOfWeights+=computedWeight;\n#else\ncomputedWeight=KERNEL_WEIGHT{X};\n#endif\n#ifdef PACKEDFLOAT\nblend+=unpack(texture2D(textureSampler,sampleCoord{X}))*computedWeight;\n#else\nblend+=texture2D(textureSampler,sampleCoord{X})*computedWeight;\n#endif",kernelBlurFragment2:"#ifdef DOF\nfactor=sampleCoC(sampleCenter+delta*KERNEL_DEP_OFFSET{X});\ncomputedWeight=KERNEL_DEP_WEIGHT{X}*factor;\nsumOfWeights+=computedWeight;\n#else\ncomputedWeight=KERNEL_DEP_WEIGHT{X};\n#endif\n#ifdef PACKEDFLOAT\nblend+=unpack(texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X}))*computedWeight;\n#else\nblend+=texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X})*computedWeight;\n#endif",kernelBlurVaryingDeclaration:"varying vec2 sampleCoord{X};",kernelBlurVertex:"sampleCoord{X}=sampleCenter+delta*KERNEL_OFFSET{X};",backgroundVertexDeclaration:"uniform mat4 view;\nuniform mat4 viewProjection;\nuniform float shadowLevel;\n#ifdef DIFFUSE\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef REFLECTION\nuniform vec2 vReflectionInfos;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\nuniform float fFovMultiplier;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif",backgroundFragmentDeclaration:" uniform vec4 vPrimaryColor;\n#ifdef USEHIGHLIGHTANDSHADOWCOLORS\nuniform vec4 vPrimaryColorShadow;\n#endif\nuniform float shadowLevel;\nuniform float alpha;\n#ifdef DIFFUSE\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef REFLECTION\nuniform vec2 vReflectionInfos;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\n#endif\n#if defined(REFLECTIONFRESNEL) || defined(OPACITYFRESNEL)\nuniform vec3 vBackgroundCenter;\n#endif\n#ifdef REFLECTIONFRESNEL\nuniform vec4 vReflectionControl;\n#endif\n#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION)\nuniform mat4 view;\n#endif",backgroundUboDeclaration:"layout(std140,column_major) uniform;\nuniform Material\n{\nuniform vec4 vPrimaryColor;\nuniform vec4 vPrimaryColorShadow;\nuniform vec2 vDiffuseInfos;\nuniform vec2 vReflectionInfos;\nuniform mat4 diffuseMatrix;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\nuniform float fFovMultiplier;\nuniform float pointSize;\nuniform float shadowLevel;\nuniform float alpha;\n#if defined(REFLECTIONFRESNEL) || defined(OPACITYFRESNEL)\nuniform vec3 vBackgroundCenter;\n#endif\n#ifdef REFLECTIONFRESNEL\nuniform vec4 vReflectionControl;\n#endif\n};\nuniform Scene {\nmat4 viewProjection;\nmat4 view;\n};"};var tl="undefined"!=typeof global?global:"undefined"!=typeof window?window:this;return tl.BABYLON=$a,void 0!==m&&(tl.Earcut={earcut:m}),$a}));

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.OIMO = global.OIMO || {})));
}(this, (function (exports) { 'use strict';

	// Polyfills

	if ( Number.EPSILON === undefined ) {

		Number.EPSILON = Math.pow( 2, - 52 );

	}

	//

	if ( Math.sign === undefined ) {

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign

		Math.sign = function ( x ) {

			return ( x < 0 ) ? - 1 : ( x > 0 ) ? 1 : + x;

		};

	}

	if ( Function.prototype.name === undefined ) {

		// Missing in IE9-11.
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name

		Object.defineProperty( Function.prototype, 'name', {

			get: function () {

				return this.toString().match( /^\s*function\s*([^\(\s]*)/ )[ 1 ];

			}

		} );

	}

	if ( Object.assign === undefined ) {

		// Missing in IE.
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign

		( function () {

			Object.assign = function ( target ) {

				'use strict';

				if ( target === undefined || target === null ) {

					throw new TypeError( 'Cannot convert undefined or null to object' );

				}

				var output = Object( target );

				for ( var index = 1; index < arguments.length; index ++ ) {

					var source = arguments[ index ];

					if ( source !== undefined && source !== null ) {

						for ( var nextKey in source ) {

							if ( Object.prototype.hasOwnProperty.call( source, nextKey ) ) {

								output[ nextKey ] = source[ nextKey ];

							}

						}

					}

				}

				return output;

			};

		} )();

	}

	/*
	 * A list of constants built-in for
	 * the physics engine.
	 */

	var REVISION = '1.0.9';

	// BroadPhase
	var BR_NULL = 0;
	var BR_BRUTE_FORCE = 1;
	var BR_SWEEP_AND_PRUNE = 2;
	var BR_BOUNDING_VOLUME_TREE = 3;

	// Body type
	var BODY_NULL = 0;
	var BODY_DYNAMIC = 1;
	var BODY_STATIC = 2;
	var BODY_KINEMATIC = 3;
	var BODY_GHOST = 4;

	// Shape type
	var SHAPE_NULL = 0;
	var SHAPE_SPHERE = 1;
	var SHAPE_BOX = 2;
	var SHAPE_CYLINDER = 3;
	var SHAPE_PLANE = 4;
	var SHAPE_PARTICLE = 5;
	var SHAPE_TETRA = 6;

	// Joint type
	var JOINT_NULL = 0;
	var JOINT_DISTANCE = 1;
	var JOINT_BALL_AND_SOCKET = 2;
	var JOINT_HINGE = 3;
	var JOINT_WHEEL = 4;
	var JOINT_SLIDER = 5;
	var JOINT_PRISMATIC = 6;

	// AABB aproximation
	var AABB_PROX = 0.005;

	var _Math = {

	    sqrt   : Math.sqrt,
	    abs    : Math.abs,
	    floor  : Math.floor,
	    cos    : Math.cos,
	    sin    : Math.sin,
	    acos   : Math.acos,
	    asin   : Math.asin,
	    atan2  : Math.atan2,
	    round  : Math.round,
	    pow    : Math.pow,
	    max    : Math.max,
	    min    : Math.min,
	    random : Math.random,

	    degtorad : 0.0174532925199432957,
	    radtodeg : 57.295779513082320876,
	    PI       : 3.141592653589793,
	    TwoPI    : 6.283185307179586,
	    PI90     : 1.570796326794896,
	    PI270    : 4.712388980384689,

	    INF      : Infinity,
	    EPZ      : 0.00001,
	    EPZ2      : 0.000001,

	    lerp: function ( x, y, t ) { 

	        return ( 1 - t ) * x + t * y; 

	    },

	    randInt: function ( low, high ) { 

	        return low + _Math.floor( _Math.random() * ( high - low + 1 ) ); 

	    },

	    rand: function ( low, high ) { 

	        return low + _Math.random() * ( high - low ); 

	    },
	    
	    generateUUID: function () {

	        // http://www.broofa.com/Tools/Math.uuid.htm

	        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split( '' );
	        var uuid = new Array( 36 );
	        var rnd = 0, r;

	        return function generateUUID() {

	            for ( var i = 0; i < 36; i ++ ) {

	                if ( i === 8 || i === 13 || i === 18 || i === 23 ) {

	                    uuid[ i ] = '-';

	                } else if ( i === 14 ) {

	                    uuid[ i ] = '4';

	                } else {

	                    if ( rnd <= 0x02 ) rnd = 0x2000000 + ( Math.random() * 0x1000000 ) | 0;
	                    r = rnd & 0xf;
	                    rnd = rnd >> 4;
	                    uuid[ i ] = chars[ ( i === 19 ) ? ( r & 0x3 ) | 0x8 : r ];

	                }

	            }

	            return uuid.join( '' );

	        };

	    }(),

	    int: function( x ) { 

	        return _Math.floor(x); 

	    },

	    fix: function( x, n ) { 

	        return x.toFixed(n || 3, 10); 

	    },

	    clamp: function ( value, min, max ) { 

	        return _Math.max( min, _Math.min( max, value ) ); 

	    },
	    
	    //clamp: function ( x, a, b ) { return ( x < a ) ? a : ( ( x > b ) ? b : x ); },

	    

	    distance: function( p1, p2 ){

	        var xd = p2[0]-p1[0];
	        var yd = p2[1]-p1[1];
	        var zd = p2[2]-p1[2];
	        return _Math.sqrt(xd*xd + yd*yd + zd*zd);

	    },

	    /*unwrapDegrees: function ( r ) {

	        r = r % 360;
	        if (r > 180) r -= 360;
	        if (r < -180) r += 360;
	        return r;

	    },

	    unwrapRadian: function( r ){

	        r = r % _Math.TwoPI;
	        if (r > _Math.PI) r -= _Math.TwoPI;
	        if (r < -_Math.PI) r += _Math.TwoPI;
	        return r;

	    },*/

	    acosClamp: function ( cos ) {

	        if(cos>1)return 0;
	        else if(cos<-1)return _Math.PI;
	        else return _Math.acos(cos);

	    },

	    distanceVector: function( v1, v2 ){

	        var xd = v1.x - v2.x;
	        var yd = v1.y - v2.y;
	        var zd = v1.z - v2.z;
	        return xd * xd + yd * yd + zd * zd;

	    },

	    dotVectors: function ( a, b ) {

	        return a.x * b.x + a.y * b.y + a.z * b.z;

	    },

	};

	function printError( clazz, msg ){
	    console.error("[OIMO] " + clazz + ": " + msg);
	}

	// A performance evaluator

	function InfoDisplay(world){

	    this.parent = world;

	    this.infos = new Float32Array( 13 );
	    this.f = [0,0,0];

	    this.times = [0,0,0,0];

	    this.broadPhase = this.parent.broadPhaseType;

	    this.version = REVISION;

	    this.fps = 0;

	    this.tt = 0;

	    this.broadPhaseTime = 0;
	    this.narrowPhaseTime = 0;
	    this.solvingTime = 0;
	    this.totalTime = 0;
	    this.updateTime = 0;

	    this.MaxBroadPhaseTime = 0;
	    this.MaxNarrowPhaseTime = 0;
	    this.MaxSolvingTime = 0;
	    this.MaxTotalTime = 0;
	    this.MaxUpdateTime = 0;
	}

	Object.assign( InfoDisplay.prototype, {

	    setTime: function(n){
	        this.times[ n || 0 ] = performance.now();
	    },

	    resetMax: function(){

	        this.MaxBroadPhaseTime = 0;
	        this.MaxNarrowPhaseTime = 0;
	        this.MaxSolvingTime = 0;
	        this.MaxTotalTime = 0;
	        this.MaxUpdateTime = 0;

	    },

	    calcBroadPhase: function () {

	        this.setTime( 2 );
	        this.broadPhaseTime = this.times[ 2 ] - this.times[ 1 ];

	    },

	    calcNarrowPhase: function () {

	        this.setTime( 3 );
	        this.narrowPhaseTime = this.times[ 3 ] - this.times[ 2 ];

	    },

	    calcEnd: function () {

	        this.setTime( 2 );
	        this.solvingTime = this.times[ 2 ] - this.times[ 1 ];
	        this.totalTime = this.times[ 2 ] - this.times[ 0 ];
	        this.updateTime = this.totalTime - ( this.broadPhaseTime + this.narrowPhaseTime + this.solvingTime );

	        if( this.tt === 100 ) this.resetMax();

	        if( this.tt > 100 ){
	            if( this.broadPhaseTime > this.MaxBroadPhaseTime ) this.MaxBroadPhaseTime = this.broadPhaseTime;
	            if( this.narrowPhaseTime > this.MaxNarrowPhaseTime ) this.MaxNarrowPhaseTime = this.narrowPhaseTime;
	            if( this.solvingTime > this.MaxSolvingTime ) this.MaxSolvingTime = this.solvingTime;
	            if( this.totalTime > this.MaxTotalTime ) this.MaxTotalTime = this.totalTime;
	            if( this.updateTime > this.MaxUpdateTime ) this.MaxUpdateTime = this.updateTime;
	        }


	        this.upfps();

	        this.tt ++;
	        if(this.tt > 500) this.tt = 0;

	    },


	    upfps : function(){
	        this.f[1] = Date.now();
	        if (this.f[1]-1000>this.f[0]){ this.f[0] = this.f[1]; this.fps = this.f[2]; this.f[2] = 0; } this.f[2]++;
	    },

	    show: function(){
	        var info =[
	            "Oimo.js "+this.version+"<br>",
	            this.broadPhase + "<br><br>",
	            "FPS: " + this.fps +" fps<br><br>",
	            "rigidbody "+this.parent.numRigidBodies+"<br>",
	            "contact &nbsp;&nbsp;"+this.parent.numContacts+"<br>",
	            "ct-point &nbsp;"+this.parent.numContactPoints+"<br>",
	            "paircheck "+this.parent.broadPhase.numPairChecks+"<br>",
	            "island &nbsp;&nbsp;&nbsp;"+this.parent.numIslands +"<br><br>",
	            "Time in milliseconds<br><br>",
	            "broadphase &nbsp;"+ _Math.fix(this.broadPhaseTime) + " | " + _Math.fix(this.MaxBroadPhaseTime) +"<br>",
	            "narrowphase "+ _Math.fix(this.narrowPhaseTime)  + " | " + _Math.fix(this.MaxNarrowPhaseTime) + "<br>",
	            "solving &nbsp;&nbsp;&nbsp;&nbsp;"+ _Math.fix(this.solvingTime)+ " | " + _Math.fix(this.MaxSolvingTime) + "<br>",
	            "total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+ _Math.fix(this.totalTime) + " | " + _Math.fix(this.MaxTotalTime) + "<br>",
	            "updating &nbsp;&nbsp;&nbsp;"+ _Math.fix(this.updateTime) + " | " + _Math.fix(this.MaxUpdateTime) + "<br>"
	        ].join("\n");
	        return info;
	    },

	    toArray: function(){
	        this.infos[0] = this.parent.broadPhase.types;
	        this.infos[1] = this.parent.numRigidBodies;
	        this.infos[2] = this.parent.numContacts;
	        this.infos[3] = this.parent.broadPhase.numPairChecks;
	        this.infos[4] = this.parent.numContactPoints;
	        this.infos[5] = this.parent.numIslands;
	        this.infos[6] = this.broadPhaseTime;
	        this.infos[7] = this.narrowPhaseTime;
	        this.infos[8] = this.solvingTime;
	        this.infos[9] = this.updateTime;
	        this.infos[10] = this.totalTime;
	        this.infos[11] = this.fps;
	        return this.infos;
	    }
	    
	});

	function Vec3 ( x, y, z ) {

	    this.x = x || 0;
	    this.y = y || 0;
	    this.z = z || 0;
	    
	}

	Object.assign( Vec3.prototype, {

	    Vec3: true,

	    set: function( x, y, z ){

	        this.x = x;
	        this.y = y;
	        this.z = z;
	        return this;

	    },

	    add: function ( a, b ) {

	        if ( b !== undefined ) return this.addVectors( a, b );

	        this.x += a.x;
	        this.y += a.y;
	        this.z += a.z;
	        return this;

	    },

	    addVectors: function ( a, b ) {

	        this.x = a.x + b.x;
	        this.y = a.y + b.y;
	        this.z = a.z + b.z;
	        return this;

	    },

	    addEqual: function ( v ) {

	        this.x += v.x;
	        this.y += v.y;
	        this.z += v.z;
	        return this;

	    },

	    sub: function ( a, b ) {

	        if ( b !== undefined ) return this.subVectors( a, b );

	        this.x -= a.x;
	        this.y -= a.y;
	        this.z -= a.z;
	        return this;

	    },

	    subVectors: function ( a, b ) {

	        this.x = a.x - b.x;
	        this.y = a.y - b.y;
	        this.z = a.z - b.z;
	        return this;

	    },

	    subEqual: function ( v ) {

	        this.x -= v.x;
	        this.y -= v.y;
	        this.z -= v.z;
	        return this;

	    },

	    scale: function ( v, s ) {

	        this.x = v.x * s;
	        this.y = v.y * s;
	        this.z = v.z * s;
	        return this;

	    },

	    scaleEqual: function( s ){

	        this.x *= s;
	        this.y *= s;
	        this.z *= s;
	        return this;

	    },

	    multiply: function( v ){

	        this.x *= v.x;
	        this.y *= v.y;
	        this.z *= v.z;
	        return this;

	    },

	    multiplyScalar: function( s ){

	        this.x *= s;
	        this.y *= s;
	        this.z *= s;
	        return this;

	    },

	    /*scaleV: function( v ){

	        this.x *= v.x;
	        this.y *= v.y;
	        this.z *= v.z;
	        return this;

	    },

	    scaleVectorEqual: function( v ){

	        this.x *= v.x;
	        this.y *= v.y;
	        this.z *= v.z;
	        return this;

	    },*/

	    addScaledVector: function ( v, s ) {

	        this.x += v.x * s;
	        this.y += v.y * s;
	        this.z += v.z * s;

	        return this;

	    },

	    subScaledVector: function ( v, s ) {

	        this.x -= v.x * s;
	        this.y -= v.y * s;
	        this.z -= v.z * s;

	        return this;

	    },

	    /*addTime: function ( v, t ) {

	        this.x += v.x * t;
	        this.y += v.y * t;
	        this.z += v.z * t;
	        return this;

	    },
	    
	    addScale: function ( v, s ) {

	        this.x += v.x * s;
	        this.y += v.y * s;
	        this.z += v.z * s;
	        return this;

	    },

	    subScale: function ( v, s ) {

	        this.x -= v.x * s;
	        this.y -= v.y * s;
	        this.z -= v.z * s;
	        return this;

	    },*/
	   
	    cross: function( a, b ) {

	        if ( b !== undefined ) return this.crossVectors( a, b );

	        var x = this.x, y = this.y, z = this.z;

	        this.x = y * a.z - z * a.y;
	        this.y = z * a.x - x * a.z;
	        this.z = x * a.y - y * a.x;

	        return this;

	    },

	    crossVectors: function ( a, b ) {

	        var ax = a.x, ay = a.y, az = a.z;
	        var bx = b.x, by = b.y, bz = b.z;

	        this.x = ay * bz - az * by;
	        this.y = az * bx - ax * bz;
	        this.z = ax * by - ay * bx;

	        return this;

	    },

	    tangent: function ( a ) {

	        var ax = a.x, ay = a.y, az = a.z;

	        this.x = ay * ax - az * az;
	        this.y = - az * ay - ax * ax;
	        this.z = ax * az + ay * ay;

	        return this;

	    },

	    

	    

	    invert: function ( v ) {

	        this.x=-v.x;
	        this.y=-v.y;
	        this.z=-v.z;
	        return this;

	    },

	    negate: function () {

	        this.x = - this.x;
	        this.y = - this.y;
	        this.z = - this.z;

	        return this;

	    },

	    dot: function ( v ) {

	        return this.x * v.x + this.y * v.y + this.z * v.z;

	    },

	    addition: function () {

	        return this.x + this.y + this.z;

	    },

	    lengthSq: function () {

	        return this.x * this.x + this.y * this.y + this.z * this.z;

	    },

	    length: function () {

	        return _Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

	    },

	    copy: function( v ){

	        this.x = v.x;
	        this.y = v.y;
	        this.z = v.z;
	        return this;

	    },

	    /*mul: function( b, a, m ){

	        return this.mulMat( m, a ).add( b );

	    },

	    mulMat: function( m, a ){

	        var e = m.elements;
	        var x = a.x, y = a.y, z = a.z;

	        this.x = e[ 0 ] * x + e[ 1 ] * y + e[ 2 ] * z;
	        this.y = e[ 3 ] * x + e[ 4 ] * y + e[ 5 ] * z;
	        this.z = e[ 6 ] * x + e[ 7 ] * y + e[ 8 ] * z;
	        return this;

	    },*/

	    applyMatrix3: function ( m, transpose ) {

	        //if( transpose ) m = m.clone().transpose();
	        var x = this.x, y = this.y, z = this.z;
	        var e = m.elements;

	        if( transpose ){
	            
	            this.x = e[ 0 ] * x + e[ 1 ] * y + e[ 2 ] * z;
	            this.y = e[ 3 ] * x + e[ 4 ] * y + e[ 5 ] * z;
	            this.z = e[ 6 ] * x + e[ 7 ] * y + e[ 8 ] * z;

	        } else {
	      
	            this.x = e[ 0 ] * x + e[ 3 ] * y + e[ 6 ] * z;
	            this.y = e[ 1 ] * x + e[ 4 ] * y + e[ 7 ] * z;
	            this.z = e[ 2 ] * x + e[ 5 ] * y + e[ 8 ] * z;
	        }

	        return this;

	    },

	    applyQuaternion: function ( q ) {

	        var x = this.x;
	        var y = this.y;
	        var z = this.z;

	        var qx = q.x;
	        var qy = q.y;
	        var qz = q.z;
	        var qw = q.w;

	        // calculate quat * vector

	        var ix =  qw * x + qy * z - qz * y;
	        var iy =  qw * y + qz * x - qx * z;
	        var iz =  qw * z + qx * y - qy * x;
	        var iw = - qx * x - qy * y - qz * z;

	        // calculate result * inverse quat

	        this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
	        this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
	        this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;

	        return this;

	    },

	    testZero: function () {

	        if(this.x!==0 || this.y!==0 || this.z!==0) return true;
	        else return false;

	    },

	    testDiff: function( v ){

	        return this.equals( v ) ? false : true;

	    },

	    equals: function ( v ) {

	        return v.x === this.x && v.y === this.y && v.z === this.z;

	    },

	    clone: function () {

	        return new this.constructor( this.x, this.y, this.z );

	    },

	    toString: function(){

	        return"Vec3["+this.x.toFixed(4)+", "+this.y.toFixed(4)+", "+this.z.toFixed(4)+"]";
	        
	    },

	    multiplyScalar: function ( scalar ) {

	        if ( isFinite( scalar ) ) {
	            this.x *= scalar;
	            this.y *= scalar;
	            this.z *= scalar;
	        } else {
	            this.x = 0;
	            this.y = 0;
	            this.z = 0;
	        }

	        return this;

	    },

	    divideScalar: function ( scalar ) {

	        return this.multiplyScalar( 1 / scalar );

	    },

	    normalize: function () {

	        return this.divideScalar( this.length() );

	    },

	    toArray: function ( array, offset ) {

	        if ( offset === undefined ) offset = 0;

	        array[ offset ] = this.x;
	        array[ offset + 1 ] = this.y;
	        array[ offset + 2 ] = this.z;

	    },

	    fromArray: function( array, offset ){

	        if ( offset === undefined ) offset = 0;
	        
	        this.x = array[ offset ];
	        this.y = array[ offset + 1 ];
	        this.z = array[ offset + 2 ];
	        return this;

	    },


	} );

	function Quat ( x, y, z, w ){

	    this.x = x || 0;
	    this.y = y || 0;
	    this.z = z || 0;
	    this.w = ( w !== undefined ) ? w : 1;

	}

	Object.assign( Quat.prototype, {

	    Quat: true,

	    set: function ( x, y, z, w ) {

	        
	        this.x = x;
	        this.y = y;
	        this.z = z;
	        this.w = w;

	        return this;

	    },

	    addTime: function( v, t ){

	        var ax = v.x, ay = v.y, az = v.z;
	        var qw = this.w, qx = this.x, qy = this.y, qz = this.z;
	        t *= 0.5;    
	        this.x += t * (  ax*qw + ay*qz - az*qy );
	        this.y += t * (  ay*qw + az*qx - ax*qz );
	        this.z += t * (  az*qw + ax*qy - ay*qx );
	        this.w += t * ( -ax*qx - ay*qy - az*qz );
	        this.normalize();
	        return this;

	    },

	    /*mul: function( q1, q2 ){

	        var ax = q1.x, ay = q1.y, az = q1.z, as = q1.w,
	        bx = q2.x, by = q2.y, bz = q2.z, bs = q2.w;
	        this.x = ax * bs + as * bx + ay * bz - az * by;
	        this.y = ay * bs + as * by + az * bx - ax * bz;
	        this.z = az * bs + as * bz + ax * by - ay * bx;
	        this.w = as * bs - ax * bx - ay * by - az * bz;
	        return this;

	    },*/

	    multiply: function ( q, p ) {

	        if ( p !== undefined ) return this.multiplyQuaternions( q, p );
	        return this.multiplyQuaternions( this, q );

	    },

	    multiplyQuaternions: function ( a, b ) {

	        var qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
	        var qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;

	        this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
	        this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
	        this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
	        this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
	        return this;

	    },

	    setFromUnitVectors: function( v1, v2 ) {

	        var vx = new Vec3();
	        var r = v1.dot( v2 ) + 1;

	        if ( r < _Math.EPS2 ) {

	            r = 0;
	            if ( _Math.abs( v1.x ) > _Math.abs( v1.z ) ) vx.set( - v1.y, v1.x, 0 );
	            else vx.set( 0, - v1.z, v1.y );

	        } else {

	            vx.crossVectors( v1, v2 );

	        }

	        this._x = vx.x;
	        this._y = vx.y;
	        this._z = vx.z;
	        this._w = r;

	        return this.normalize();

	    },

	    arc: function( v1, v2 ){

	        var x1 = v1.x;
	        var y1 = v1.y;
	        var z1 = v1.z;
	        var x2 = v2.x;
	        var y2 = v2.y;
	        var z2 = v2.z;
	        var d = x1*x2 + y1*y2 + z1*z2;
	        if( d==-1 ){
	            x2 = y1*x1 - z1*z1;
	            y2 = -z1*y1 - x1*x1;
	            z2 = x1*z1 + y1*y1;
	            d = 1 / _Math.sqrt( x2*x2 + y2*y2 + z2*z2 );
	            this.w = 0;
	            this.x = x2*d;
	            this.y = y2*d;
	            this.z = z2*d;
	            return this;
	        }
	        var cx = y1*z2 - z1*y2;
	        var cy = z1*x2 - x1*z2;
	        var cz = x1*y2 - y1*x2;
	        this.w = _Math.sqrt( ( 1 + d) * 0.5 );
	        d = 0.5 / this.w;
	        this.x = cx * d;
	        this.y = cy * d;
	        this.z = cz * d;
	        return this;

	    },

	    normalize: function(){

	        var l = this.length();
	        if ( l === 0 ) {
	            this.set( 0, 0, 0, 1 );
	        } else {
	            l = 1 / l;
	            this.x = this.x * l;
	            this.y = this.y * l;
	            this.z = this.z * l;
	            this.w = this.w * l;
	        }
	        return this;

	    },

	    inverse: function () {

	        return this.conjugate().normalize();

	    },

	    invert: function ( q ) {

	        this.x = q.x;
	        this.y = q.y;
	        this.z = q.z;
	        this.w = q.w;
	        this.conjugate().normalize();
	        return this;

	    },

	    conjugate: function () {

	        this.x *= - 1;
	        this.y *= - 1;
	        this.z *= - 1;
	        return this;

	    },

	    length: function(){

	        return _Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w  );

	    },

	    lengthSq: function () {

	        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;

	    },
	    
	    copy: function( q ){
	        
	        this.x = q.x;
	        this.y = q.y;
	        this.z = q.z;
	        this.w = q.w;
	        return this;

	    },

	    clone: function( q ){

	        return new Quat( this.x, this.y, this.z, this.w );

	    },

	    testDiff: function ( q ) {

	        return this.equals( q ) ? false : true;

	    },

	    equals: function ( q ) {

	        return this.x === q.x && this.y === q.y && this.z === q.z && this.w === q.w;

	    },

	    toString: function(){

	        return"Quat["+this.x.toFixed(4)+", ("+this.y.toFixed(4)+", "+this.z.toFixed(4)+", "+this.w.toFixed(4)+")]";
	        
	    },

	    setFromEuler: function ( x, y, z ){

	        var c1 = Math.cos( x * 0.5 );
	        var c2 = Math.cos( y * 0.5 );
	        var c3 = Math.cos( z * 0.5 );
	        var s1 = Math.sin( x * 0.5 );
	        var s2 = Math.sin( y * 0.5 );
	        var s3 = Math.sin( z * 0.5 );

	        // XYZ
	        this.x = s1 * c2 * c3 + c1 * s2 * s3;
	        this.y = c1 * s2 * c3 - s1 * c2 * s3;
	        this.z = c1 * c2 * s3 + s1 * s2 * c3;
	        this.w = c1 * c2 * c3 - s1 * s2 * s3;

	        return this;

	    },
	    
	    setFromAxis: function ( axis, rad ) {

	        axis.normalize();
	        rad = rad * 0.5;
	        var s = _Math.sin( rad );
	        this.x = s * axis.x;
	        this.y = s * axis.y;
	        this.z = s * axis.z;
	        this.w = _Math.cos( rad );
	        return this;

	    },

	    setFromMat33: function ( m ) {

	        var trace = m[0] + m[4] + m[8];
	        var s;

	        if ( trace > 0 ) {

	            s = _Math.sqrt( trace + 1.0 );
	            this.w = 0.5 / s;
	            s = 0.5 / s;
	            this.x = ( m[5] - m[7] ) * s;
	            this.y = ( m[6] - m[2] ) * s;
	            this.z = ( m[1] - m[3] ) * s;

	        } else {

	            var out = [];
	            var i = 0;
	            if ( m[4] > m[0] ) i = 1;
	            if ( m[8] > m[i*3+i] ) i = 2;

	            var j = (i+1)%3;
	            var k = (i+2)%3;
	            
	            s = _Math.sqrt( m[i*3+i] - m[j*3+j] - m[k*3+k] + 1.0 );
	            out[i] = 0.5 * fRoot;
	            s = 0.5 / fRoot;
	            this.w = ( m[j*3+k] - m[k*3+j] ) * s;
	            out[j] = ( m[j*3+i] + m[i*3+j] ) * s;
	            out[k] = ( m[k*3+i] + m[i*3+k] ) * s;

	            this.x = out[1];
	            this.y = out[2];
	            this.z = out[3];

	        }

	        return this;

	    },

	    toArray: function ( array, offset ) {

	        offset = offset || 0;

	        array[ offset ] = this.x;
	        array[ offset + 1 ] = this.y;
	        array[ offset + 2 ] = this.z;
	        array[ offset + 3 ] = this.w;

	    },

	    fromArray: function( array, offset ){

	        offset = offset || 0;
	        this.set( array[ offset ], array[ offset + 1 ], array[ offset + 2 ], array[ offset + 3 ] );
	        return this;

	    }

	});

	function Mat33 ( e00, e01, e02, e10, e11, e12, e20, e21, e22 ){

	    this.elements = [
	        1, 0, 0,
	        0, 1, 0,
	        0, 0, 1
	    ];

	    if ( arguments.length > 0 ) {

	        console.error( 'OIMO.Mat33: the constructor no longer reads arguments. use .set() instead.' );

	    }

	}

	Object.assign( Mat33.prototype, {

	    Mat33: true,

	    set: function ( e00, e01, e02, e10, e11, e12, e20, e21, e22 ){

	        var te = this.elements;
	        te[0] = e00; te[1] = e01; te[2] = e02;
	        te[3] = e10; te[4] = e11; te[5] = e12;
	        te[6] = e20; te[7] = e21; te[8] = e22;
	        return this;

	    },
	    
	    add: function ( a, b ) {

	        if( b !== undefined ) return this.addMatrixs( a, b );

	        var e = this.elements, te = a.elements;
	        e[0] += te[0]; e[1] += te[1]; e[2] += te[2];
	        e[3] += te[3]; e[4] += te[4]; e[5] += te[5];
	        e[6] += te[6]; e[7] += te[7]; e[8] += te[8];
	        return this;

	    },

	    addMatrixs: function ( a, b ) {

	        var te = this.elements, tem1 = a.elements, tem2 = b.elements;
	        te[0] = tem1[0] + tem2[0]; te[1] = tem1[1] + tem2[1]; te[2] = tem1[2] + tem2[2];
	        te[3] = tem1[3] + tem2[3]; te[4] = tem1[4] + tem2[4]; te[5] = tem1[5] + tem2[5];
	        te[6] = tem1[6] + tem2[6]; te[7] = tem1[7] + tem2[7]; te[8] = tem1[8] + tem2[8];
	        return this;

	    },

	    addEqual: function( m ){

	        var te = this.elements, tem = m.elements;
	        te[0] += tem[0]; te[1] += tem[1]; te[2] += tem[2];
	        te[3] += tem[3]; te[4] += tem[4]; te[5] += tem[5];
	        te[6] += tem[6]; te[7] += tem[7]; te[8] += tem[8];
	        return this;

	    },

	    sub: function ( a, b ) {

	        if( b !== undefined ) return this.subMatrixs( a, b );

	        var e = this.elements, te = a.elements;
	        e[0] -= te[0]; e[1] -= te[1]; e[2] -= te[2];
	        e[3] -= te[3]; e[4] -= te[4]; e[5] -= te[5];
	        e[6] -= te[6]; e[7] -= te[7]; e[8] -= te[8];
	        return this;

	    },

	    subMatrixs: function ( a, b ) {

	        var te = this.elements, tem1 = a.elements, tem2 = b.elements;
	        te[0] = tem1[0] - tem2[0]; te[1] = tem1[1] - tem2[1]; te[2] = tem1[2] - tem2[2];
	        te[3] = tem1[3] - tem2[3]; te[4] = tem1[4] - tem2[4]; te[5] = tem1[5] - tem2[5];
	        te[6] = tem1[6] - tem2[6]; te[7] = tem1[7] - tem2[7]; te[8] = tem1[8] - tem2[8];
	        return this;

	    },

	    subEqual: function ( m ) {

	        var te = this.elements, tem = m.elements;
	        te[0] -= tem[0]; te[1] -= tem[1]; te[2] -= tem[2];
	        te[3] -= tem[3]; te[4] -= tem[4]; te[5] -= tem[5];
	        te[6] -= tem[6]; te[7] -= tem[7]; te[8] -= tem[8];
	        return this;

	    },

	    scale: function ( m, s ) {

	        var te = this.elements, tm = m.elements;
	        te[0] = tm[0] * s; te[1] = tm[1] * s; te[2] = tm[2] * s;
	        te[3] = tm[3] * s; te[4] = tm[4] * s; te[5] = tm[5] * s;
	        te[6] = tm[6] * s; te[7] = tm[7] * s; te[8] = tm[8] * s;
	        return this;

	    },

	    scaleEqual: function ( s ){// multiplyScalar

	        var te = this.elements;
	        te[0] *= s; te[1] *= s; te[2] *= s;
	        te[3] *= s; te[4] *= s; te[5] *= s;
	        te[6] *= s; te[7] *= s; te[8] *= s;
	        return this;

	    },

	    multiplyMatrices: function ( m1, m2, transpose ) {

	        if( transpose ) m2 = m2.clone().transpose();

	        var te = this.elements;
	        var tm1 = m1.elements;
	        var tm2 = m2.elements;

	        var a0 = tm1[0], a3 = tm1[3], a6 = tm1[6];
	        var a1 = tm1[1], a4 = tm1[4], a7 = tm1[7];
	        var a2 = tm1[2], a5 = tm1[5], a8 = tm1[8];

	        var b0 = tm2[0], b3 = tm2[3], b6 = tm2[6];
	        var b1 = tm2[1], b4 = tm2[4], b7 = tm2[7];
	        var b2 = tm2[2], b5 = tm2[5], b8 = tm2[8];

	        te[0] = a0*b0 + a1*b3 + a2*b6;
	        te[1] = a0*b1 + a1*b4 + a2*b7;
	        te[2] = a0*b2 + a1*b5 + a2*b8;
	        te[3] = a3*b0 + a4*b3 + a5*b6;
	        te[4] = a3*b1 + a4*b4 + a5*b7;
	        te[5] = a3*b2 + a4*b5 + a5*b8;
	        te[6] = a6*b0 + a7*b3 + a8*b6;
	        te[7] = a6*b1 + a7*b4 + a8*b7;
	        te[8] = a6*b2 + a7*b5 + a8*b8;

	        return this;

	    },

	    /*mul: function ( m1, m2, transpose ) {

	        if( transpose ) m2 = m2.clone().transpose();

	        var te = this.elements;
	        var tm1 = m1.elements;
	        var tm2 = m2.elements;
	        //var tmp;

	        var a0 = tm1[0], a3 = tm1[3], a6 = tm1[6];
	        var a1 = tm1[1], a4 = tm1[4], a7 = tm1[7];
	        var a2 = tm1[2], a5 = tm1[5], a8 = tm1[8];

	        var b0 = tm2[0], b3 = tm2[3], b6 = tm2[6];
	        var b1 = tm2[1], b4 = tm2[4], b7 = tm2[7];
	        var b2 = tm2[2], b5 = tm2[5], b8 = tm2[8];

	        /*if( transpose ){

	            tmp = b1; b1 = b3; b3 = tmp;
	            tmp = b2; b2 = b6; b6 = tmp;
	            tmp = b5; b5 = b7; b7 = tmp;

	        }

	        te[0] = a0*b0 + a1*b3 + a2*b6;
	        te[1] = a0*b1 + a1*b4 + a2*b7;
	        te[2] = a0*b2 + a1*b5 + a2*b8;
	        te[3] = a3*b0 + a4*b3 + a5*b6;
	        te[4] = a3*b1 + a4*b4 + a5*b7;
	        te[5] = a3*b2 + a4*b5 + a5*b8;
	        te[6] = a6*b0 + a7*b3 + a8*b6;
	        te[7] = a6*b1 + a7*b4 + a8*b7;
	        te[8] = a6*b2 + a7*b5 + a8*b8;

	        return this;

	    },*/

	    transpose: function ( m ) {
	        
	        if( m !== undefined ){
	            var a = m.elements;
	            this.set( a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8] );
	            return this;
	        }

	        var te = this.elements;
	        var a01 = te[1], a02 = te[2], a12 = te[5];
	        te[1] = te[3];
	        te[2] = te[6];
	        te[3] = a01;
	        te[5] = te[7];
	        te[6] = a02;
	        te[7] = a12;
	        return this;

	    },



	    /*mulScale: function ( m, sx, sy, sz, Prepend ) {

	        var prepend = Prepend || false;
	        var te = this.elements, tm = m.elements;
	        if(prepend){
	            te[0] = sx*tm[0]; te[1] = sx*tm[1]; te[2] = sx*tm[2];
	            te[3] = sy*tm[3]; te[4] = sy*tm[4]; te[5] = sy*tm[5];
	            te[6] = sz*tm[6]; te[7] = sz*tm[7]; te[8] = sz*tm[8];
	        }else{
	            te[0] = tm[0]*sx; te[1] = tm[1]*sy; te[2] = tm[2]*sz;
	            te[3] = tm[3]*sx; te[4] = tm[4]*sy; te[5] = tm[5]*sz;
	            te[6] = tm[6]*sx; te[7] = tm[7]*sy; te[8] = tm[8]*sz;
	        }
	        return this;

	    },

	    transpose: function ( m ) {

	        var te = this.elements, tm = m.elements;
	        te[0] = tm[0]; te[1] = tm[3]; te[2] = tm[6];
	        te[3] = tm[1]; te[4] = tm[4]; te[5] = tm[7];
	        te[6] = tm[2]; te[7] = tm[5]; te[8] = tm[8];
	        return this;

	    },*/

	    setQuat: function ( q ) {

	        var te = this.elements;
	        var x = q.x, y = q.y, z = q.z, w = q.w;
	        var x2 = x + x,  y2 = y + y, z2 = z + z;
	        var xx = x * x2, xy = x * y2, xz = x * z2;
	        var yy = y * y2, yz = y * z2, zz = z * z2;
	        var wx = w * x2, wy = w * y2, wz = w * z2;
	        
	        te[0] = 1 - ( yy + zz );
	        te[1] = xy - wz;
	        te[2] = xz + wy;

	        te[3] = xy + wz;
	        te[4] = 1 - ( xx + zz );
	        te[5] = yz - wx;

	        te[6] = xz - wy;
	        te[7] = yz + wx;
	        te[8] = 1 - ( xx + yy );

	        return this;

	    },

	    invert: function( m ) {

	        var te = this.elements, tm = m.elements,
	        a00 = tm[0], a10 = tm[3], a20 = tm[6],
	        a01 = tm[1], a11 = tm[4], a21 = tm[7],
	        a02 = tm[2], a12 = tm[5], a22 = tm[8],
	        b01 = a22 * a11 - a12 * a21,
	        b11 = -a22 * a10 + a12 * a20,
	        b21 = a21 * a10 - a11 * a20,
	        det = a00 * b01 + a01 * b11 + a02 * b21;

	        if ( det === 0 ) {
	            console.log( "can't invert matrix, determinant is 0");
	            return this.identity();
	        }

	        det = 1.0 / det;
	        te[0] = b01 * det;
	        te[1] = (-a22 * a01 + a02 * a21) * det;
	        te[2] = (a12 * a01 - a02 * a11) * det;
	        te[3] = b11 * det;
	        te[4] = (a22 * a00 - a02 * a20) * det;
	        te[5] = (-a12 * a00 + a02 * a10) * det;
	        te[6] = b21 * det;
	        te[7] = (-a21 * a00 + a01 * a20) * det;
	        te[8] = (a11 * a00 - a01 * a10) * det;
	        return this;

	    },

	    addOffset: function ( m, v ) {

	        var relX = v.x;
	        var relY = v.y;
	        var relZ = v.z;

	        var te = this.elements;
	        te[0] += m * ( relY * relY + relZ * relZ );
	        te[4] += m * ( relX * relX + relZ * relZ );
	        te[8] += m * ( relX * relX + relY * relY );
	        var xy = m * relX * relY;
	        var yz = m * relY * relZ;
	        var zx = m * relZ * relX;
	        te[1] -= xy;
	        te[3] -= xy;
	        te[2] -= yz;
	        te[6] -= yz;
	        te[5] -= zx;
	        te[7] -= zx;
	        return this;

	    },

	    subOffset: function ( m, v ) {

	        var relX = v.x;
	        var relY = v.y;
	        var relZ = v.z;

	        var te = this.elements;
	        te[0] -= m * ( relY * relY + relZ * relZ );
	        te[4] -= m * ( relX * relX + relZ * relZ );
	        te[8] -= m * ( relX * relX + relY * relY );
	        var xy = m * relX * relY;
	        var yz = m * relY * relZ;
	        var zx = m * relZ * relX;
	        te[1] += xy;
	        te[3] += xy;
	        te[2] += yz;
	        te[6] += yz;
	        te[5] += zx;
	        te[7] += zx;
	        return this;

	    },

	    // OK 

	    multiplyScalar: function ( s ) {

	        var te = this.elements;

	        te[ 0 ] *= s; te[ 3 ] *= s; te[ 6 ] *= s;
	        te[ 1 ] *= s; te[ 4 ] *= s; te[ 7 ] *= s;
	        te[ 2 ] *= s; te[ 5 ] *= s; te[ 8 ] *= s;

	        return this;

	    },

	    identity: function () {

	        this.set( 1, 0, 0, 0, 1, 0, 0, 0, 1 );
	        return this;

	    },


	    clone: function () {

	        return new Mat33().fromArray( this.elements );

	    },

	    copy: function ( m ) {

	        for ( var i = 0; i < 9; i ++ ) this.elements[ i ] = m.elements[ i ];
	        return this;

	    },

	    determinant: function () {

	        var te = this.elements;
	        var a = te[ 0 ], b = te[ 1 ], c = te[ 2 ],
	            d = te[ 3 ], e = te[ 4 ], f = te[ 5 ],
	            g = te[ 6 ], h = te[ 7 ], i = te[ 8 ];

	        return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;

	    },

	    fromArray: function ( array, offset ) {

	        if ( offset === undefined ) offset = 0;

	        for( var i = 0; i < 9; i ++ ) {

	            this.elements[ i ] = array[ i + offset ];

	        }

	        return this;

	    },

	    toArray: function ( array, offset ) {

	        if ( array === undefined ) array = [];
	        if ( offset === undefined ) offset = 0;

	        var te = this.elements;

	        array[ offset ] = te[ 0 ];
	        array[ offset + 1 ] = te[ 1 ];
	        array[ offset + 2 ] = te[ 2 ];

	        array[ offset + 3 ] = te[ 3 ];
	        array[ offset + 4 ] = te[ 4 ];
	        array[ offset + 5 ] = te[ 5 ];

	        array[ offset + 6 ] = te[ 6 ];
	        array[ offset + 7 ] = te[ 7 ];
	        array[ offset + 8 ] = te[ 8 ];

	        return array;

	    }


	} );

	/**
	 * An axis-aligned bounding box.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function AABB( minX, maxX, minY, maxY, minZ, maxZ ){

	    this.elements = new Float32Array( 6 );
	    var te = this.elements;

	    te[0] = minX || 0; te[1] = minY || 0; te[2] = minZ || 0;
	    te[3] = maxX || 0; te[4] = maxY || 0; te[5] = maxZ || 0;

	}

	Object.assign( AABB.prototype, {

		AABB: true,

		set: function(minX, maxX, minY, maxY, minZ, maxZ){

			var te = this.elements;
			te[0] = minX;
			te[3] = maxX;
			te[1] = minY;
			te[4] = maxY;
			te[2] = minZ;
			te[5] = maxZ;
			return this;
		},

		intersectTest: function ( aabb ) {

			var te = this.elements;
			var ue = aabb.elements;
			return te[0] > ue[3] || te[1] > ue[4] || te[2] > ue[5] || te[3] < ue[0] || te[4] < ue[1] || te[5] < ue[2] ? true : false;

		},

		intersectTestTwo: function ( aabb ) {

			var te = this.elements;
			var ue = aabb.elements;
			return te[0] < ue[0] || te[1] < ue[1] || te[2] < ue[2] || te[3] > ue[3] || te[4] > ue[4] || te[5] > ue[5] ? true : false;

		},

		clone: function () {

			return new this.constructor().fromArray( this.elements );

		},

		copy: function ( aabb, margin ) {

			var m = margin || 0;
			var me = aabb.elements;
			this.set( me[ 0 ]-m, me[ 3 ]+m, me[ 1 ]-m, me[ 4 ]+m, me[ 2 ]-m, me[ 5 ]+m );
			return this;

		},

		fromArray: function ( array ) {

			this.elements.set( array );
			return this;

		},

		// Set this AABB to the combined AABB of aabb1 and aabb2.

		combine: function( aabb1, aabb2 ) {

			var a = aabb1.elements;
			var b = aabb2.elements;
			var te = this.elements;

			te[0] = a[0] < b[0] ? a[0] : b[0];
			te[1] = a[1] < b[1] ? a[1] : b[1];
			te[2] = a[2] < b[2] ? a[2] : b[2];

			te[3] = a[3] > b[3] ? a[3] : b[3];
			te[4] = a[4] > b[4] ? a[4] : b[4];
			te[5] = a[5] > b[5] ? a[5] : b[5];

			return this;

		},


		// Get the surface area.

		surfaceArea: function () {

			var te = this.elements;
			var a = te[3] - te[0];
			var h = te[4] - te[1];
			var d = te[5] - te[2];
			return 2 * (a * (h + d) + h * d );

		},


		// Get whether the AABB intersects with the point or not.

		intersectsWithPoint:function(x,y,z){

			var te = this.elements;
			return x>=te[0] && x<=te[3] && y>=te[1] && y<=te[4] && z>=te[2] && z<=te[5];

		},

		/**
		 * Set the AABB from an array
		 * of vertices. From THREE.
		 * @author WestLangley
		 * @author xprogram
		 */

		setFromPoints: function(arr){
			this.makeEmpty();
			for(var i = 0; i < arr.length; i++){
				this.expandByPoint(arr[i]);
			}
		},

		makeEmpty: function(){
			this.set(-Infinity, -Infinity, -Infinity, Infinity, Infinity, Infinity);
		},

		expandByPoint: function(pt){
			var te = this.elements;
			this.set(
				_Math.min(te[ 0 ], pt.x), _Math.min(te[ 1 ], pt.y), _Math.min(te[ 2 ], pt.z),
				_Math.max(te[ 3 ], pt.x), _Math.max(te[ 4 ], pt.y), _Math.max(te[ 5 ], pt.z)
			);
		},

		expandByScalar: function(s){

			var te = this.elements;
			te[0] += -s;
			te[1] += -s;
			te[2] += -s;
			te[3] += s;
			te[4] += s;
			te[5] += s;
		}

	});

	var count = 0;
	function ShapeIdCount() { return count++; }

	/**
	 * A shape is used to detect collisions of rigid bodies.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function Shape ( config ) {

	    this.type = SHAPE_NULL;

	    // global identification of the shape should be unique to the shape.
	    this.id = ShapeIdCount();

	    // previous shape in parent rigid body. Used for fast interations.
	    this.prev = null;

	    // next shape in parent rigid body. Used for fast interations.
	    this.next = null;

	    // proxy of the shape used for broad-phase collision detection.
	    this.proxy = null;

	    // parent rigid body of the shape.
	    this.parent = null;

	    // linked list of the contacts with the shape.
	    this.contactLink = null;

	    // number of the contacts with the shape.
	    this.numContacts = 0;

	    // center of gravity of the shape in world coordinate system.
	    this.position = new Vec3();

	    // rotation matrix of the shape in world coordinate system.
	    this.rotation = new Mat33();

	    // position of the shape in parent's coordinate system.
	    this.relativePosition = new Vec3().copy( config.relativePosition );

	    // rotation matrix of the shape in parent's coordinate system.
	    this.relativeRotation = new Mat33().copy( config.relativeRotation );

	    // axis-aligned bounding box of the shape.
	    this.aabb = new AABB();

	    // density of the shape.
	    this.density = config.density;

	    // coefficient of friction of the shape.
	    this.friction = config.friction;

	    // coefficient of restitution of the shape.
	    this.restitution = config.restitution;

	    // bits of the collision groups to which the shape belongs.
	    this.belongsTo = config.belongsTo;

	    // bits of the collision groups with which the shape collides.
	    this.collidesWith = config.collidesWith;

	}

	Object.assign( Shape.prototype, {

	    Shape: true,

	    // Calculate the mass information of the shape.

	    calculateMassInfo: function( out ){

	        printError("Shape", "Inheritance error.");

	    },

	    // Update the proxy of the shape.

	    updateProxy: function(){

	        printError("Shape", "Inheritance error.");

	    }

	});

	/**
	 * Box shape.
	 * @author saharan
	 * @author lo-th
	 */
	 
	function Box ( config, Width, Height, Depth ) {

	    Shape.call( this, config );

	    this.type = SHAPE_BOX;

	    this.width = Width;
	    this.height = Height;
	    this.depth = Depth;

	    this.halfWidth = Width * 0.5;
	    this.halfHeight = Height * 0.5;
	    this.halfDepth = Depth * 0.5;

	    this.dimentions = new Float32Array( 18 );
	    this.elements = new Float32Array( 24 );

	}

	Box.prototype = Object.assign( Object.create( Shape.prototype ), {

		constructor: Box,

		calculateMassInfo: function ( out ) {

			var mass = this.width * this.height * this.depth * this.density;
			var divid = 1/12;
			out.mass = mass;
			out.inertia.set(
				mass * ( this.height * this.height + this.depth * this.depth ) * divid, 0, 0,
				0, mass * ( this.width * this.width + this.depth * this.depth ) * divid, 0,
				0, 0, mass * ( this.width * this.width + this.height * this.height ) * divid
			);

		},

		updateProxy: function () {

			var te = this.rotation.elements;
			var di = this.dimentions;
			// Width
			di[0] = te[0];
			di[1] = te[3];
			di[2] = te[6];
			// Height
			di[3] = te[1];
			di[4] = te[4];
			di[5] = te[7];
			// Depth
			di[6] = te[2];
			di[7] = te[5];
			di[8] = te[8];
			// half Width
			di[9] = te[0] * this.halfWidth;
			di[10] = te[3] * this.halfWidth;
			di[11] = te[6] * this.halfWidth;
			// half Height
			di[12] = te[1] * this.halfHeight;
			di[13] = te[4] * this.halfHeight;
			di[14] = te[7] * this.halfHeight;
			// half Depth
			di[15] = te[2] * this.halfDepth;
			di[16] = te[5] * this.halfDepth;
			di[17] = te[8] * this.halfDepth;

			var wx = di[9];
			var wy = di[10];
			var wz = di[11];
			var hx = di[12];
			var hy = di[13];
			var hz = di[14];
			var dx = di[15];
			var dy = di[16];
			var dz = di[17];

			var x = this.position.x;
			var y = this.position.y;
			var z = this.position.z;

			var v = this.elements;
			//v1
			v[0] = x + wx + hx + dx;
			v[1] = y + wy + hy + dy;
			v[2] = z + wz + hz + dz;
			//v2
			v[3] = x + wx + hx - dx;
			v[4] = y + wy + hy - dy;
			v[5] = z + wz + hz - dz;
			//v3
			v[6] = x + wx - hx + dx;
			v[7] = y + wy - hy + dy;
			v[8] = z + wz - hz + dz;
			//v4
			v[9] = x + wx - hx - dx;
			v[10] = y + wy - hy - dy;
			v[11] = z + wz - hz - dz;
			//v5
			v[12] = x - wx + hx + dx;
			v[13] = y - wy + hy + dy;
			v[14] = z - wz + hz + dz;
			//v6
			v[15] = x - wx + hx - dx;
			v[16] = y - wy + hy - dy;
			v[17] = z - wz + hz - dz;
			//v7
			v[18] = x - wx - hx + dx;
			v[19] = y - wy - hy + dy;
			v[20] = z - wz - hz + dz;
			//v8
			v[21] = x - wx - hx - dx;
			v[22] = y - wy - hy - dy;
			v[23] = z - wz - hz - dz;

			var w = di[9] < 0 ? -di[9] : di[9];
			var h = di[10] < 0 ? -di[10] : di[10];
			var d = di[11] < 0 ? -di[11] : di[11];

			w = di[12] < 0 ? w - di[12] : w + di[12];
			h = di[13] < 0 ? h - di[13] : h + di[13];
			d = di[14] < 0 ? d - di[14] : d + di[14];

			w = di[15] < 0 ? w - di[15] : w + di[15];
			h = di[16] < 0 ? h - di[16] : h + di[16];
			d = di[17] < 0 ? d - di[17] : d + di[17];

			var p = AABB_PROX;

			this.aabb.set(
				this.position.x - w - p, this.position.x + w + p,
				this.position.y - h - p, this.position.y + h + p,
				this.position.z - d - p, this.position.z + d + p
			);

			if ( this.proxy != null ) this.proxy.update();

		}
	});

	/**
	 * Sphere shape
	 * @author saharan
	 * @author lo-th
	 */

	function Sphere( config, radius ) {

	    Shape.call( this, config );

	    this.type = SHAPE_SPHERE;

	    // radius of the shape.
	    this.radius = radius;

	}

	Sphere.prototype = Object.assign( Object.create( Shape.prototype ), {

		constructor: Sphere,

		volume: function () {

			return _Math.PI * this.radius * 1.333333;

		},

		calculateMassInfo: function ( out ) {

			var mass = this.volume() * this.radius * this.radius * this.density; //1.333 * _Math.PI * this.radius * this.radius * this.radius * this.density;
			out.mass = mass;
			var inertia = mass * this.radius * this.radius * 0.4;
			out.inertia.set( inertia, 0, 0, 0, inertia, 0, 0, 0, inertia );

		},

		updateProxy: function () {

			var p = AABB_PROX;

			this.aabb.set(
				this.position.x - this.radius - p, this.position.x + this.radius + p,
				this.position.y - this.radius - p, this.position.y + this.radius + p,
				this.position.z - this.radius - p, this.position.z + this.radius + p
			);

			if ( this.proxy != null ) this.proxy.update();

		}

	});

	/**
	 * Cylinder shape
	 * @author saharan
	 * @author lo-th
	 */

	function Cylinder ( config, radius, height ) {

	    Shape.call( this, config );

	    this.type = SHAPE_CYLINDER;

	    this.radius = radius;
	    this.height = height;
	    this.halfHeight = height * 0.5;

	    this.normalDirection = new Vec3();
	    this.halfDirection = new Vec3();

	}

	Cylinder.prototype = Object.assign( Object.create( Shape.prototype ), {

	    constructor: Cylinder,

	    calculateMassInfo: function ( out ) {

	        var rsq = this.radius * this.radius;
	        var mass = _Math.PI * rsq * this.height * this.density;
	        var inertiaXZ = ( ( 0.25 * rsq ) + ( 0.0833 * this.height * this.height ) ) * mass;
	        var inertiaY = 0.5 * rsq;
	        out.mass = mass;
	        out.inertia.set( inertiaXZ, 0, 0,  0, inertiaY, 0,  0, 0, inertiaXZ );

	    },

	    updateProxy: function () {

	        var te = this.rotation.elements;
	        var len, wx, hy, dz, xx, yy, zz, w, h, d, p;

	        xx = te[1] * te[1];
	        yy = te[4] * te[4];
	        zz = te[7] * te[7];

	        this.normalDirection.set( te[1], te[4], te[7] );
	        this.halfDirection.scale( this.normalDirection, this.halfHeight );

	        wx = 1 - xx;
	        len = _Math.sqrt(wx*wx + xx*yy + xx*zz);
	        if(len>0) len = this.radius/len;
	        wx *= len;
	        hy = 1 - yy;
	        len = _Math.sqrt(yy*xx + hy*hy + yy*zz);
	        if(len>0) len = this.radius/len;
	        hy *= len;
	        dz = 1 - zz;
	        len = _Math.sqrt(zz*xx + zz*yy + dz*dz);
	        if(len>0) len = this.radius/len;
	        dz *= len;

	        w = this.halfDirection.x < 0 ? -this.halfDirection.x : this.halfDirection.x;
	        h = this.halfDirection.y < 0 ? -this.halfDirection.y : this.halfDirection.y;
	        d = this.halfDirection.z < 0 ? -this.halfDirection.z : this.halfDirection.z;

	        w = wx < 0 ? w - wx : w + wx;
	        h = hy < 0 ? h - hy : h + hy;
	        d = dz < 0 ? d - dz : d + dz;

	        p = AABB_PROX;

	        this.aabb.set(
	            this.position.x - w - p, this.position.x + w + p,
	            this.position.y - h - p, this.position.y + h + p,
	            this.position.z - d - p, this.position.z + d + p
	        );

	        if ( this.proxy != null ) this.proxy.update();

	    }

	});

	/**
	 * Plane shape.
	 * @author lo-th
	 */

	function Plane( config, normal ) {

	    Shape.call( this, config );

	    this.type = SHAPE_PLANE;

	    // radius of the shape.
	    this.normal = new Vec3( 0, 1, 0 );

	}

	Plane.prototype = Object.assign( Object.create( Shape.prototype ), {

	    constructor: Plane,

	    volume: function () {

	        return Number.MAX_VALUE;

	    },

	    calculateMassInfo: function ( out ) {

	        out.mass = this.density;//0.0001;
	        var inertia = 1;
	        out.inertia.set( inertia, 0, 0, 0, inertia, 0, 0, 0, inertia );

	    },

	    updateProxy: function () {

	        var p = AABB_PROX;

	        var min = -_Math.INF;
	        var max = _Math.INF;
	        var n = this.normal;
	        // The plane AABB is infinite, except if the normal is pointing along any axis
	        this.aabb.set(
	            n.x === -1 ? this.position.x - p : min, n.x === 1 ? this.position.x + p : max,
	            n.y === -1 ? this.position.y - p : min, n.y === 1 ? this.position.y + p : max,
	            n.z === -1 ? this.position.z - p : min, n.z === 1 ? this.position.z + p : max
	        );

	        if ( this.proxy != null ) this.proxy.update();

	    }

	});

	/**
	 * A Particule shape
	 * @author lo-th
	 */

	function Particle( config, normal ) {

	    Shape.call( this, config );

	    this.type = SHAPE_PARTICLE;

	}

	Particle.prototype = Object.assign( Object.create( Shape.prototype ), {

	    constructor: Particle,

	    volume: function () {

	        return Number.MAX_VALUE;

	    },

	    calculateMassInfo: function ( out ) {

	        var inertia = 0;
	        out.inertia.set( inertia, 0, 0, 0, inertia, 0, 0, 0, inertia );

	    },

	    updateProxy: function () {

	        var p = 0;//AABB_PROX;

	        this.aabb.set(
	            this.position.x - p, this.position.x + p,
	            this.position.y - p, this.position.y + p,
	            this.position.z - p, this.position.z + p
	        );

	        if ( this.proxy != null ) this.proxy.update();

	    }

	});

	/**
	 * A shape configuration holds common configuration data for constructing a shape.
	 * These configurations can be reused safely.
	 *
	 * @author saharan
	 * @author lo-th
	 */
	 
	function ShapeConfig(){

	    // position of the shape in parent's coordinate system.
	    this.relativePosition = new Vec3();
	    // rotation matrix of the shape in parent's coordinate system.
	    this.relativeRotation = new Mat33();
	    // coefficient of friction of the shape.
	    this.friction = 0.2; // 0.4
	    // coefficient of restitution of the shape.
	    this.restitution = 0.2;
	    // density of the shape.
	    this.density = 1;
	    // bits of the collision groups to which the shape belongs.
	    this.belongsTo = 1;
	    // bits of the collision groups with which the shape collides.
	    this.collidesWith = 0xffffffff;

	}

	/**
	* An information of limit and motor.
	*
	* @author saharan
	*/

	function LimitMotor ( axis, fixed ) {

	    fixed = fixed || false;
	    // The axis of the constraint.
	    this.axis = axis;
	    // The current angle for rotational constraints.
	    this.angle = 0;
	    // The lower limit. Set lower > upper to disable
	    this.lowerLimit = fixed ? 0 : 1;

	    //  The upper limit. Set lower > upper to disable.
	    this.upperLimit = 0;
	    // The target motor speed.
	    this.motorSpeed = 0;
	    // The maximum motor force or torque. Set 0 to disable.
	    this.maxMotorForce = 0;
	    // The frequency of the spring. Set 0 to disable.
	    this.frequency = 0;
	    // The damping ratio of the spring. Set 0 for no damping, 1 for critical damping.
	    this.dampingRatio = 0;

	}

	Object.assign( LimitMotor.prototype, {

	    LimitMotor: true,

	    // Set limit data into this constraint.
	    setLimit:function ( lowerLimit, upperLimit ) {

	        this.lowerLimit = lowerLimit;
	        this.upperLimit = upperLimit;

	    },

	    // Set motor data into this constraint.
	    setMotor:function ( motorSpeed, maxMotorForce ) {
	        
	        this.motorSpeed = motorSpeed;
	        this.maxMotorForce = maxMotorForce;

	    },

	    // Set spring data into this constraint.
	    setSpring:function ( frequency, dampingRatio ) {
	        
	        this.frequency = frequency;
	        this.dampingRatio = dampingRatio;
	        
	    }

	});

	/**
	 * The base class of all type of the constraints.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function Constraint(){

	    // parent world of the constraint.
	    this.parent = null;

	    // first body of the constraint.
	    this.body1 = null;

	    // second body of the constraint.
	    this.body2 = null;

	    // Internal
	    this.addedToIsland = false;
	    
	}

	Object.assign( Constraint.prototype, {

	    Constraint: true,

	    // Prepare for solving the constraint
	    preSolve: function( timeStep, invTimeStep ){

	        printError("Constraint", "Inheritance error.");

	    },

	    // Solve the constraint. This is usually called iteratively.
	    solve: function(){

	        printError("Constraint", "Inheritance error.");

	    },

	    // Do the post-processing.
	    postSolve: function(){

	        printError("Constraint", "Inheritance error.");

	    }

	});

	function JointLink ( joint ){
	    
	    // The previous joint link.
	    this.prev = null;
	    // The next joint link.
	    this.next = null;
	    // The other rigid body connected to the joint.
	    this.body = null;
	    // The joint of the link.
	    this.joint = joint;

	}

	/**
	 * Joints are used to constrain the motion between two rigid bodies.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function Joint ( config ){

	    Constraint.call( this );

	    this.scale = 1;
	    this.invScale = 1;

	    // joint name
	    this.name = "";
	    this.id = NaN;

	    // The type of the joint.
	    this.type = JOINT_NULL;
	    //  The previous joint in the world.
	    this.prev = null;
	    // The next joint in the world.
	    this.next = null;

	    this.body1 = config.body1;
	    this.body2 = config.body2;

	    // anchor point on the first rigid body in local coordinate system.
	    this.localAnchorPoint1 = new Vec3().copy( config.localAnchorPoint1 );
	    // anchor point on the second rigid body in local coordinate system.
	    this.localAnchorPoint2 = new Vec3().copy( config.localAnchorPoint2 );
	    // anchor point on the first rigid body in world coordinate system relative to the body's origin.
	    this.relativeAnchorPoint1 = new Vec3();
	    // anchor point on the second rigid body in world coordinate system relative to the body's origin.
	    this.relativeAnchorPoint2 = new Vec3();
	    //  anchor point on the first rigid body in world coordinate system.
	    this.anchorPoint1 = new Vec3();
	    // anchor point on the second rigid body in world coordinate system.
	    this.anchorPoint2 = new Vec3();
	    // Whether allow collision between connected rigid bodies or not.
	    this.allowCollision = config.allowCollision;

	    this.b1Link = new JointLink( this );
	    this.b2Link = new JointLink( this );

	}

	Joint.prototype = Object.assign( Object.create( Constraint.prototype ), {

	    constructor: Joint,

	    setId: function ( n ) { 

	        this.id = i; 

	    },

	    setParent: function ( world ) {

	        this.parent = world;
	        this.scale = this.parent.scale;
	        this.invScale = this.parent.invScale;
	        this.id = this.parent.numJoints;
	        if( !this.name ) this.name = 'J' +  this.id;

	    },

	    // Update all the anchor points.

	    updateAnchorPoints: function () {

	        this.relativeAnchorPoint1.copy( this.localAnchorPoint1 ).applyMatrix3( this.body1.rotation, true );
	        this.relativeAnchorPoint2.copy( this.localAnchorPoint2 ).applyMatrix3( this.body2.rotation, true );

	        this.anchorPoint1.add( this.relativeAnchorPoint1, this.body1.position );
	        this.anchorPoint2.add( this.relativeAnchorPoint2, this.body2.position );

	    },

	    // Attach the joint from the bodies.

	    attach: function ( isX ) {

	        this.b1Link.body = this.body2;
	        this.b2Link.body = this.body1;

	        if(isX){

	            this.body1.jointLink.push( this.b1Link );
	            this.body2.jointLink.push( this.b2Link );

	        } else {

	            if(this.body1.jointLink != null) (this.b1Link.next=this.body1.jointLink).prev = this.b1Link;
	            else this.b1Link.next = null;
	            this.body1.jointLink = this.b1Link;
	            this.body1.numJoints++;
	            if(this.body2.jointLink != null) (this.b2Link.next=this.body2.jointLink).prev = this.b2Link;
	            else this.b2Link.next = null;
	            this.body2.jointLink = this.b2Link;
	            this.body2.numJoints++;

	        }

	    },

	    // Detach the joint from the bodies.

	    detach: function ( isX ) {

	        if( isX ){

	            this.body1.jointLink.splice( this.body1.jointLink.indexOf( this.b1Link ), 1 );
	            this.body2.jointLink.splice( this.body2.jointLink.indexOf( this.b2Link ), 1 );

	        } else {

	            var prev = this.b1Link.prev;
	            var next = this.b1Link.next;
	            if(prev != null) prev.next = next;
	            if(next != null) next.prev = prev;
	            if(this.body1.jointLink == this.b1Link) this.body1.jointLink = next;
	            this.b1Link.prev = null;
	            this.b1Link.next = null;
	            this.b1Link.body = null;
	            this.body1.numJoints--;

	            prev = this.b2Link.prev;
	            next = this.b2Link.next;
	            if(prev != null) prev.next = next;
	            if(next != null) next.prev = prev;
	            if(this.body2.jointLink==this.b2Link) this.body2.jointLink = next;
	            this.b2Link.prev = null;
	            this.b2Link.next = null;
	            this.b2Link.body = null;
	            this.body2.numJoints--;

	        }

	        this.b1Link.body = null;
	        this.b2Link.body = null;

	    },


	    // Awake the bodies.

	    awake: function () {

	        this.body1.awake();
	        this.body2.awake();

	    },

	    // calculation function

	    preSolve: function ( timeStep, invTimeStep ) {

	    },

	    solve: function () {

	    },

	    postSolve: function () {

	    },

	    // Delete process

	    remove: function () {

	        this.dispose();

	    },

	    dispose: function () {

	        this.parent.removeJoint( this );

	    },


	    // Three js add

	    getPosition: function () {

	        var p1 = new Vec3().scale( this.anchorPoint1, this.scale );
	        var p2 = new Vec3().scale( this.anchorPoint2, this.scale );
	        return [ p1, p2 ];

	    }

	});

	/**
	* A linear constraint for all axes for various joints.
	* @author saharan
	*/
	function LinearConstraint ( joint ){

	    this.m1=NaN;
	    this.m2=NaN;

	    this.ii1 = null;
	    this.ii2 = null;
	    this.dd = null;

	    this.r1x=NaN;
	    this.r1y=NaN;
	    this.r1z=NaN;

	    this.r2x=NaN;
	    this.r2y=NaN;
	    this.r2z=NaN;

	    this.ax1x=NaN;
	    this.ax1y=NaN;
	    this.ax1z=NaN;
	    this.ay1x=NaN;
	    this.ay1y=NaN;
	    this.ay1z=NaN;
	    this.az1x=NaN;
	    this.az1y=NaN;
	    this.az1z=NaN;

	    this.ax2x=NaN;
	    this.ax2y=NaN;
	    this.ax2z=NaN;
	    this.ay2x=NaN;
	    this.ay2y=NaN;
	    this.ay2z=NaN;
	    this.az2x=NaN;
	    this.az2y=NaN;
	    this.az2z=NaN;

	    this.vel=NaN;
	    this.velx=NaN;
	    this.vely=NaN;
	    this.velz=NaN;


	    this.joint = joint;
	    this.r1 = joint.relativeAnchorPoint1;
	    this.r2 = joint.relativeAnchorPoint2;
	    this.p1 = joint.anchorPoint1;
	    this.p2 = joint.anchorPoint2;
	    this.b1 = joint.body1;
	    this.b2 = joint.body2;
	    this.l1 = this.b1.linearVelocity;
	    this.l2 = this.b2.linearVelocity;
	    this.a1 = this.b1.angularVelocity;
	    this.a2 = this.b2.angularVelocity;
	    this.i1 = this.b1.inverseInertia;
	    this.i2 = this.b2.inverseInertia;
	    this.impx = 0;
	    this.impy = 0;
	    this.impz = 0;

	}

	Object.assign( LinearConstraint.prototype, {

	    LinearConstraint: true,

	    preSolve: function ( timeStep, invTimeStep ) {
	        
	        this.r1x = this.r1.x;
	        this.r1y = this.r1.y;
	        this.r1z = this.r1.z;

	        this.r2x = this.r2.x;
	        this.r2y = this.r2.y;
	        this.r2z = this.r2.z;

	        this.m1 = this.b1.inverseMass;
	        this.m2 = this.b2.inverseMass;

	        this.ii1 = this.i1.clone();
	        this.ii2 = this.i2.clone();

	        var ii1 = this.ii1.elements;
	        var ii2 = this.ii2.elements;

	        this.ax1x = this.r1z*ii1[1]+-this.r1y*ii1[2];
	        this.ax1y = this.r1z*ii1[4]+-this.r1y*ii1[5];
	        this.ax1z = this.r1z*ii1[7]+-this.r1y*ii1[8];
	        this.ay1x = -this.r1z*ii1[0]+this.r1x*ii1[2];
	        this.ay1y = -this.r1z*ii1[3]+this.r1x*ii1[5];
	        this.ay1z = -this.r1z*ii1[6]+this.r1x*ii1[8];
	        this.az1x = this.r1y*ii1[0]+-this.r1x*ii1[1];
	        this.az1y = this.r1y*ii1[3]+-this.r1x*ii1[4];
	        this.az1z = this.r1y*ii1[6]+-this.r1x*ii1[7];
	        this.ax2x = this.r2z*ii2[1]+-this.r2y*ii2[2];
	        this.ax2y = this.r2z*ii2[4]+-this.r2y*ii2[5];
	        this.ax2z = this.r2z*ii2[7]+-this.r2y*ii2[8];
	        this.ay2x = -this.r2z*ii2[0]+this.r2x*ii2[2];
	        this.ay2y = -this.r2z*ii2[3]+this.r2x*ii2[5];
	        this.ay2z = -this.r2z*ii2[6]+this.r2x*ii2[8];
	        this.az2x = this.r2y*ii2[0]+-this.r2x*ii2[1];
	        this.az2y = this.r2y*ii2[3]+-this.r2x*ii2[4];
	        this.az2z = this.r2y*ii2[6]+-this.r2x*ii2[7];

	        // calculate point-to-point mass matrix
	        // from impulse equation
	        // 
	        // M = ([/m] - [r^][/I][r^]) ^ -1
	        // 
	        // where
	        // 
	        // [/m] = |1/m, 0, 0|
	        //        |0, 1/m, 0|
	        //        |0, 0, 1/m|
	        // 
	        // [r^] = |0, -rz, ry|
	        //        |rz, 0, -rx|
	        //        |-ry, rx, 0|
	        // 
	        // [/I] = Inverted moment inertia

	        var rxx = this.m1+this.m2;

	        var kk = new Mat33().set( rxx, 0, 0,  0, rxx, 0,  0, 0, rxx );
	        var k = kk.elements;

	        k[0] += ii1[4]*this.r1z*this.r1z-(ii1[7]+ii1[5])*this.r1y*this.r1z+ii1[8]*this.r1y*this.r1y;
	        k[1] += (ii1[6]*this.r1y+ii1[5]*this.r1x)*this.r1z-ii1[3]*this.r1z*this.r1z-ii1[8]*this.r1x*this.r1y;
	        k[2] += (ii1[3]*this.r1y-ii1[4]*this.r1x)*this.r1z-ii1[6]*this.r1y*this.r1y+ii1[7]*this.r1x*this.r1y;
	        k[3] += (ii1[2]*this.r1y+ii1[7]*this.r1x)*this.r1z-ii1[1]*this.r1z*this.r1z-ii1[8]*this.r1x*this.r1y;
	        k[4] += ii1[0]*this.r1z*this.r1z-(ii1[6]+ii1[2])*this.r1x*this.r1z+ii1[8]*this.r1x*this.r1x;
	        k[5] += (ii1[1]*this.r1x-ii1[0]*this.r1y)*this.r1z-ii1[7]*this.r1x*this.r1x+ii1[6]*this.r1x*this.r1y;
	        k[6] += (ii1[1]*this.r1y-ii1[4]*this.r1x)*this.r1z-ii1[2]*this.r1y*this.r1y+ii1[5]*this.r1x*this.r1y;
	        k[7] += (ii1[3]*this.r1x-ii1[0]*this.r1y)*this.r1z-ii1[5]*this.r1x*this.r1x+ii1[2]*this.r1x*this.r1y;
	        k[8] += ii1[0]*this.r1y*this.r1y-(ii1[3]+ii1[1])*this.r1x*this.r1y+ii1[4]*this.r1x*this.r1x;

	        k[0] += ii2[4]*this.r2z*this.r2z-(ii2[7]+ii2[5])*this.r2y*this.r2z+ii2[8]*this.r2y*this.r2y;
	        k[1] += (ii2[6]*this.r2y+ii2[5]*this.r2x)*this.r2z-ii2[3]*this.r2z*this.r2z-ii2[8]*this.r2x*this.r2y;
	        k[2] += (ii2[3]*this.r2y-ii2[4]*this.r2x)*this.r2z-ii2[6]*this.r2y*this.r2y+ii2[7]*this.r2x*this.r2y;
	        k[3] += (ii2[2]*this.r2y+ii2[7]*this.r2x)*this.r2z-ii2[1]*this.r2z*this.r2z-ii2[8]*this.r2x*this.r2y;
	        k[4] += ii2[0]*this.r2z*this.r2z-(ii2[6]+ii2[2])*this.r2x*this.r2z+ii2[8]*this.r2x*this.r2x;
	        k[5] += (ii2[1]*this.r2x-ii2[0]*this.r2y)*this.r2z-ii2[7]*this.r2x*this.r2x+ii2[6]*this.r2x*this.r2y;
	        k[6] += (ii2[1]*this.r2y-ii2[4]*this.r2x)*this.r2z-ii2[2]*this.r2y*this.r2y+ii2[5]*this.r2x*this.r2y;
	        k[7] += (ii2[3]*this.r2x-ii2[0]*this.r2y)*this.r2z-ii2[5]*this.r2x*this.r2x+ii2[2]*this.r2x*this.r2y;
	        k[8] += ii2[0]*this.r2y*this.r2y-(ii2[3]+ii2[1])*this.r2x*this.r2y+ii2[4]*this.r2x*this.r2x;

	        var inv=1/( k[0]*(k[4]*k[8]-k[7]*k[5]) + k[3]*(k[7]*k[2]-k[1]*k[8]) + k[6]*(k[1]*k[5]-k[4]*k[2]) );
	        this.dd = new Mat33().set(
	            k[4]*k[8]-k[5]*k[7], k[2]*k[7]-k[1]*k[8], k[1]*k[5]-k[2]*k[4],
	            k[5]*k[6]-k[3]*k[8], k[0]*k[8]-k[2]*k[6], k[2]*k[3]-k[0]*k[5],
	            k[3]*k[7]-k[4]*k[6], k[1]*k[6]-k[0]*k[7], k[0]*k[4]-k[1]*k[3]
	        ).scaleEqual( inv );

	        this.velx = this.p2.x-this.p1.x;
	        this.vely = this.p2.y-this.p1.y;
	        this.velz = this.p2.z-this.p1.z;
	        var len = _Math.sqrt(this.velx*this.velx+this.vely*this.vely+this.velz*this.velz);
	        if(len>0.005){
	            len = (0.005-len)/len*invTimeStep*0.05;
	            this.velx *= len;
	            this.vely *= len;
	            this.velz *= len;
	        }else{
	            this.velx = 0;
	            this.vely = 0;
	            this.velz = 0;
	        }

	        this.impx *= 0.95;
	        this.impy *= 0.95;
	        this.impz *= 0.95;
	        
	        this.l1.x += this.impx*this.m1;
	        this.l1.y += this.impy*this.m1;
	        this.l1.z += this.impz*this.m1;
	        this.a1.x += this.impx*this.ax1x+this.impy*this.ay1x+this.impz*this.az1x;
	        this.a1.y += this.impx*this.ax1y+this.impy*this.ay1y+this.impz*this.az1y;
	        this.a1.z += this.impx*this.ax1z+this.impy*this.ay1z+this.impz*this.az1z;
	        this.l2.x -= this.impx*this.m2;
	        this.l2.y -= this.impy*this.m2;
	        this.l2.z -= this.impz*this.m2;
	        this.a2.x -= this.impx*this.ax2x+this.impy*this.ay2x+this.impz*this.az2x;
	        this.a2.y -= this.impx*this.ax2y+this.impy*this.ay2y+this.impz*this.az2y;
	        this.a2.z -= this.impx*this.ax2z+this.impy*this.ay2z+this.impz*this.az2z;
	    },

	    solve: function () {

	        var d = this.dd.elements;
	        var rvx = this.l2.x-this.l1.x+this.a2.y*this.r2z-this.a2.z*this.r2y-this.a1.y*this.r1z+this.a1.z*this.r1y-this.velx;
	        var rvy = this.l2.y-this.l1.y+this.a2.z*this.r2x-this.a2.x*this.r2z-this.a1.z*this.r1x+this.a1.x*this.r1z-this.vely;
	        var rvz = this.l2.z-this.l1.z+this.a2.x*this.r2y-this.a2.y*this.r2x-this.a1.x*this.r1y+this.a1.y*this.r1x-this.velz;
	        var nimpx = rvx*d[0]+rvy*d[1]+rvz*d[2];
	        var nimpy = rvx*d[3]+rvy*d[4]+rvz*d[5];
	        var nimpz = rvx*d[6]+rvy*d[7]+rvz*d[8];
	        this.impx += nimpx;
	        this.impy += nimpy;
	        this.impz += nimpz;
	        this.l1.x += nimpx*this.m1;
	        this.l1.y += nimpy*this.m1;
	        this.l1.z += nimpz*this.m1;
	        this.a1.x += nimpx*this.ax1x+nimpy*this.ay1x+nimpz*this.az1x;
	        this.a1.y += nimpx*this.ax1y+nimpy*this.ay1y+nimpz*this.az1y;
	        this.a1.z += nimpx*this.ax1z+nimpy*this.ay1z+nimpz*this.az1z;
	        this.l2.x -= nimpx*this.m2;
	        this.l2.y -= nimpy*this.m2;
	        this.l2.z -= nimpz*this.m2;
	        this.a2.x -= nimpx*this.ax2x+nimpy*this.ay2x+nimpz*this.az2x;
	        this.a2.y -= nimpx*this.ax2y+nimpy*this.ay2y+nimpz*this.az2y;
	        this.a2.z -= nimpx*this.ax2z+nimpy*this.ay2z+nimpz*this.az2z;

	    }

	} );

	/**
	* A three-axis rotational constraint for various joints.
	* @author saharan
	*/

	function Rotational3Constraint ( joint, limitMotor1, limitMotor2, limitMotor3 ) {
	    
	    this.cfm1=NaN;
	    this.cfm2=NaN;
	    this.cfm3=NaN;
	    this.i1e00=NaN;
	    this.i1e01=NaN;
	    this.i1e02=NaN;
	    this.i1e10=NaN;
	    this.i1e11=NaN;
	    this.i1e12=NaN;
	    this.i1e20=NaN;
	    this.i1e21=NaN;
	    this.i1e22=NaN;
	    this.i2e00=NaN;
	    this.i2e01=NaN;
	    this.i2e02=NaN;
	    this.i2e10=NaN;
	    this.i2e11=NaN;
	    this.i2e12=NaN;
	    this.i2e20=NaN;
	    this.i2e21=NaN;
	    this.i2e22=NaN;
	    this.ax1=NaN;
	    this.ay1=NaN;
	    this.az1=NaN;
	    this.ax2=NaN;
	    this.ay2=NaN;
	    this.az2=NaN;
	    this.ax3=NaN;
	    this.ay3=NaN;
	    this.az3=NaN;

	    this.a1x1=NaN; // jacoians
	    this.a1y1=NaN;
	    this.a1z1=NaN;
	    this.a2x1=NaN;
	    this.a2y1=NaN;
	    this.a2z1=NaN;
	    this.a1x2=NaN;
	    this.a1y2=NaN;
	    this.a1z2=NaN;
	    this.a2x2=NaN;
	    this.a2y2=NaN;
	    this.a2z2=NaN;
	    this.a1x3=NaN;
	    this.a1y3=NaN;
	    this.a1z3=NaN;
	    this.a2x3=NaN;
	    this.a2y3=NaN;
	    this.a2z3=NaN;

	    this.lowerLimit1=NaN;
	    this.upperLimit1=NaN;
	    this.limitVelocity1=NaN;
	    this.limitState1=0; // -1: at lower, 0: locked, 1: at upper, 2: free
	    this.enableMotor1=false;
	    this.motorSpeed1=NaN;
	    this.maxMotorForce1=NaN;
	    this.maxMotorImpulse1=NaN;
	    this.lowerLimit2=NaN;
	    this.upperLimit2=NaN;
	    this.limitVelocity2=NaN;
	    this.limitState2=0; // -1: at lower, 0: locked, 1: at upper, 2: free
	    this.enableMotor2=false;
	    this.motorSpeed2=NaN;
	    this.maxMotorForce2=NaN;
	    this.maxMotorImpulse2=NaN;
	    this.lowerLimit3=NaN;
	    this.upperLimit3=NaN;
	    this.limitVelocity3=NaN;
	    this.limitState3=0; // -1: at lower, 0: locked, 1: at upper, 2: free
	    this.enableMotor3=false;
	    this.motorSpeed3=NaN;
	    this.maxMotorForce3=NaN;
	    this.maxMotorImpulse3=NaN;

	    this.k00=NaN; // K = J*M*JT
	    this.k01=NaN;
	    this.k02=NaN;
	    this.k10=NaN;
	    this.k11=NaN;
	    this.k12=NaN;
	    this.k20=NaN;
	    this.k21=NaN;
	    this.k22=NaN;

	    this.kv00=NaN; // diagonals without CFMs
	    this.kv11=NaN;
	    this.kv22=NaN;

	    this.dv00=NaN; // ...inverted
	    this.dv11=NaN;
	    this.dv22=NaN;

	    this.d00=NaN;  // K^-1
	    this.d01=NaN;
	    this.d02=NaN;
	    this.d10=NaN;
	    this.d11=NaN;
	    this.d12=NaN;
	    this.d20=NaN;
	    this.d21=NaN;
	    this.d22=NaN;

	    this.limitMotor1=limitMotor1;
	    this.limitMotor2=limitMotor2;
	    this.limitMotor3=limitMotor3;
	    this.b1=joint.body1;
	    this.b2=joint.body2;
	    this.a1=this.b1.angularVelocity;
	    this.a2=this.b2.angularVelocity;
	    this.i1=this.b1.inverseInertia;
	    this.i2=this.b2.inverseInertia;
	    this.limitImpulse1=0;
	    this.motorImpulse1=0;
	    this.limitImpulse2=0;
	    this.motorImpulse2=0;
	    this.limitImpulse3=0;
	    this.motorImpulse3=0;

	}

	Object.assign( Rotational3Constraint.prototype, {

	    Rotational3Constraint: true,

	    preSolve: function( timeStep, invTimeStep ){

	        this.ax1=this.limitMotor1.axis.x;
	        this.ay1=this.limitMotor1.axis.y;
	        this.az1=this.limitMotor1.axis.z;
	        this.ax2=this.limitMotor2.axis.x;
	        this.ay2=this.limitMotor2.axis.y;
	        this.az2=this.limitMotor2.axis.z;
	        this.ax3=this.limitMotor3.axis.x;
	        this.ay3=this.limitMotor3.axis.y;
	        this.az3=this.limitMotor3.axis.z;
	        this.lowerLimit1=this.limitMotor1.lowerLimit;
	        this.upperLimit1=this.limitMotor1.upperLimit;
	        this.motorSpeed1=this.limitMotor1.motorSpeed;
	        this.maxMotorForce1=this.limitMotor1.maxMotorForce;
	        this.enableMotor1=this.maxMotorForce1>0;
	        this.lowerLimit2=this.limitMotor2.lowerLimit;
	        this.upperLimit2=this.limitMotor2.upperLimit;
	        this.motorSpeed2=this.limitMotor2.motorSpeed;
	        this.maxMotorForce2=this.limitMotor2.maxMotorForce;
	        this.enableMotor2=this.maxMotorForce2>0;
	        this.lowerLimit3=this.limitMotor3.lowerLimit;
	        this.upperLimit3=this.limitMotor3.upperLimit;
	        this.motorSpeed3=this.limitMotor3.motorSpeed;
	        this.maxMotorForce3=this.limitMotor3.maxMotorForce;
	        this.enableMotor3=this.maxMotorForce3>0;

	        var ti1 = this.i1.elements;
	        var ti2 = this.i2.elements;
	        this.i1e00=ti1[0];
	        this.i1e01=ti1[1];
	        this.i1e02=ti1[2];
	        this.i1e10=ti1[3];
	        this.i1e11=ti1[4];
	        this.i1e12=ti1[5];
	        this.i1e20=ti1[6];
	        this.i1e21=ti1[7];
	        this.i1e22=ti1[8];

	        this.i2e00=ti2[0];
	        this.i2e01=ti2[1];
	        this.i2e02=ti2[2];
	        this.i2e10=ti2[3];
	        this.i2e11=ti2[4];
	        this.i2e12=ti2[5];
	        this.i2e20=ti2[6];
	        this.i2e21=ti2[7];
	        this.i2e22=ti2[8];

	        var frequency1=this.limitMotor1.frequency;
	        var frequency2=this.limitMotor2.frequency;
	        var frequency3=this.limitMotor3.frequency;
	        var enableSpring1=frequency1>0;
	        var enableSpring2=frequency2>0;
	        var enableSpring3=frequency3>0;
	        var enableLimit1=this.lowerLimit1<=this.upperLimit1;
	        var enableLimit2=this.lowerLimit2<=this.upperLimit2;
	        var enableLimit3=this.lowerLimit3<=this.upperLimit3;
	        var angle1=this.limitMotor1.angle;
	        if(enableLimit1){
	            if(this.lowerLimit1==this.upperLimit1){
	                if(this.limitState1!=0){
	                    this.limitState1=0;
	                    this.limitImpulse1=0;
	                }
	                this.limitVelocity1=this.lowerLimit1-angle1;
	            }else if(angle1<this.lowerLimit1){
	                if(this.limitState1!=-1){
	                    this.limitState1=-1;
	                    this.limitImpulse1=0;
	                }
	                this.limitVelocity1=this.lowerLimit1-angle1;
	            }else if(angle1>this.upperLimit1){
	                if(this.limitState1!=1){
	                    this.limitState1=1;
	                    this.limitImpulse1=0;
	                }
	                this.limitVelocity1=this.upperLimit1-angle1;
	            }else{
	                this.limitState1=2;
	                this.limitImpulse1=0;
	                this.limitVelocity1=0;
	            }
	            if(!enableSpring1){
	                if(this.limitVelocity1>0.02)this.limitVelocity1-=0.02;
	                else if(this.limitVelocity1<-0.02)this.limitVelocity1+=0.02;
	                else this.limitVelocity1=0;
	            }
	        }else{
	            this.limitState1=2;
	            this.limitImpulse1=0;
	        }

	        var angle2=this.limitMotor2.angle;
	        if(enableLimit2){
	            if(this.lowerLimit2==this.upperLimit2){
	                if(this.limitState2!=0){
	                    this.limitState2=0;
	                    this.limitImpulse2=0;
	                }
	                this.limitVelocity2=this.lowerLimit2-angle2;
	            }else if(angle2<this.lowerLimit2){
	                if(this.limitState2!=-1){
	                    this.limitState2=-1;
	                    this.limitImpulse2=0;
	                }
	                this.limitVelocity2=this.lowerLimit2-angle2;
	            }else if(angle2>this.upperLimit2){
	                if(this.limitState2!=1){
	                    this.limitState2=1;
	                    this.limitImpulse2=0;
	                }
	                this.limitVelocity2=this.upperLimit2-angle2;
	            }else{
	                this.limitState2=2;
	                this.limitImpulse2=0;
	                this.limitVelocity2=0;
	            }
	            if(!enableSpring2){
	                if(this.limitVelocity2>0.02)this.limitVelocity2-=0.02;
	                else if(this.limitVelocity2<-0.02)this.limitVelocity2+=0.02;
	                else this.limitVelocity2=0;
	            }
	        }else{
	            this.limitState2=2;
	            this.limitImpulse2=0;
	        }

	        var angle3=this.limitMotor3.angle;
	        if(enableLimit3){
	            if(this.lowerLimit3==this.upperLimit3){
	                if(this.limitState3!=0){
	                    this.limitState3=0;
	                    this.limitImpulse3=0;
	                }
	                this.limitVelocity3=this.lowerLimit3-angle3;
	            }else if(angle3<this.lowerLimit3){
	                if(this.limitState3!=-1){
	                    this.limitState3=-1;
	                    this.limitImpulse3=0;
	                }
	                this.limitVelocity3=this.lowerLimit3-angle3;
	            }else if(angle3>this.upperLimit3){
	                if(this.limitState3!=1){
	                    this.limitState3=1;
	                    this.limitImpulse3=0;
	                }
	                this.limitVelocity3=this.upperLimit3-angle3;
	            }else{
	                this.limitState3=2;
	                this.limitImpulse3=0;
	                this.limitVelocity3=0;
	                }
	            if(!enableSpring3){
	                if(this.limitVelocity3>0.02)this.limitVelocity3-=0.02;
	                else if(this.limitVelocity3<-0.02)this.limitVelocity3+=0.02;
	                else this.limitVelocity3=0;
	            }
	        }else{
	            this.limitState3=2;
	            this.limitImpulse3=0;
	        }

	        if(this.enableMotor1&&(this.limitState1!=0||enableSpring1)){
	            this.maxMotorImpulse1=this.maxMotorForce1*timeStep;
	        }else{
	            this.motorImpulse1=0;
	            this.maxMotorImpulse1=0;
	        }
	        if(this.enableMotor2&&(this.limitState2!=0||enableSpring2)){
	            this.maxMotorImpulse2=this.maxMotorForce2*timeStep;
	        }else{
	            this.motorImpulse2=0;
	            this.maxMotorImpulse2=0;
	        }
	        if(this.enableMotor3&&(this.limitState3!=0||enableSpring3)){
	            this.maxMotorImpulse3=this.maxMotorForce3*timeStep;
	        }else{
	            this.motorImpulse3=0;
	            this.maxMotorImpulse3=0;
	        }

	        // build jacobians
	        this.a1x1=this.ax1*this.i1e00+this.ay1*this.i1e01+this.az1*this.i1e02;
	        this.a1y1=this.ax1*this.i1e10+this.ay1*this.i1e11+this.az1*this.i1e12;
	        this.a1z1=this.ax1*this.i1e20+this.ay1*this.i1e21+this.az1*this.i1e22;
	        this.a2x1=this.ax1*this.i2e00+this.ay1*this.i2e01+this.az1*this.i2e02;
	        this.a2y1=this.ax1*this.i2e10+this.ay1*this.i2e11+this.az1*this.i2e12;
	        this.a2z1=this.ax1*this.i2e20+this.ay1*this.i2e21+this.az1*this.i2e22;

	        this.a1x2=this.ax2*this.i1e00+this.ay2*this.i1e01+this.az2*this.i1e02;
	        this.a1y2=this.ax2*this.i1e10+this.ay2*this.i1e11+this.az2*this.i1e12;
	        this.a1z2=this.ax2*this.i1e20+this.ay2*this.i1e21+this.az2*this.i1e22;
	        this.a2x2=this.ax2*this.i2e00+this.ay2*this.i2e01+this.az2*this.i2e02;
	        this.a2y2=this.ax2*this.i2e10+this.ay2*this.i2e11+this.az2*this.i2e12;
	        this.a2z2=this.ax2*this.i2e20+this.ay2*this.i2e21+this.az2*this.i2e22;

	        this.a1x3=this.ax3*this.i1e00+this.ay3*this.i1e01+this.az3*this.i1e02;
	        this.a1y3=this.ax3*this.i1e10+this.ay3*this.i1e11+this.az3*this.i1e12;
	        this.a1z3=this.ax3*this.i1e20+this.ay3*this.i1e21+this.az3*this.i1e22;
	        this.a2x3=this.ax3*this.i2e00+this.ay3*this.i2e01+this.az3*this.i2e02;
	        this.a2y3=this.ax3*this.i2e10+this.ay3*this.i2e11+this.az3*this.i2e12;
	        this.a2z3=this.ax3*this.i2e20+this.ay3*this.i2e21+this.az3*this.i2e22;

	        // build an impulse matrix
	        this.k00=this.ax1*(this.a1x1+this.a2x1)+this.ay1*(this.a1y1+this.a2y1)+this.az1*(this.a1z1+this.a2z1);
	        this.k01=this.ax1*(this.a1x2+this.a2x2)+this.ay1*(this.a1y2+this.a2y2)+this.az1*(this.a1z2+this.a2z2);
	        this.k02=this.ax1*(this.a1x3+this.a2x3)+this.ay1*(this.a1y3+this.a2y3)+this.az1*(this.a1z3+this.a2z3);
	        this.k10=this.ax2*(this.a1x1+this.a2x1)+this.ay2*(this.a1y1+this.a2y1)+this.az2*(this.a1z1+this.a2z1);
	        this.k11=this.ax2*(this.a1x2+this.a2x2)+this.ay2*(this.a1y2+this.a2y2)+this.az2*(this.a1z2+this.a2z2);
	        this.k12=this.ax2*(this.a1x3+this.a2x3)+this.ay2*(this.a1y3+this.a2y3)+this.az2*(this.a1z3+this.a2z3);
	        this.k20=this.ax3*(this.a1x1+this.a2x1)+this.ay3*(this.a1y1+this.a2y1)+this.az3*(this.a1z1+this.a2z1);
	        this.k21=this.ax3*(this.a1x2+this.a2x2)+this.ay3*(this.a1y2+this.a2y2)+this.az3*(this.a1z2+this.a2z2);
	        this.k22=this.ax3*(this.a1x3+this.a2x3)+this.ay3*(this.a1y3+this.a2y3)+this.az3*(this.a1z3+this.a2z3);

	        this.kv00=this.k00;
	        this.kv11=this.k11;
	        this.kv22=this.k22;
	        this.dv00=1/this.kv00;
	        this.dv11=1/this.kv11;
	        this.dv22=1/this.kv22;

	        if(enableSpring1&&this.limitState1!=2){
	            var omega=6.2831853*frequency1;
	            var k=omega*omega*timeStep;
	            var dmp=invTimeStep/(k+2*this.limitMotor1.dampingRatio*omega);
	            this.cfm1=this.kv00*dmp;
	            this.limitVelocity1*=k*dmp;
	        }else{
	            this.cfm1=0;
	            this.limitVelocity1*=invTimeStep*0.05;
	        }

	        if(enableSpring2&&this.limitState2!=2){
	            omega=6.2831853*frequency2;
	            k=omega*omega*timeStep;
	            dmp=invTimeStep/(k+2*this.limitMotor2.dampingRatio*omega);
	            this.cfm2=this.kv11*dmp;
	            this.limitVelocity2*=k*dmp;
	        }else{
	            this.cfm2=0;
	            this.limitVelocity2*=invTimeStep*0.05;
	        }

	        if(enableSpring3&&this.limitState3!=2){
	            omega=6.2831853*frequency3;
	            k=omega*omega*timeStep;
	            dmp=invTimeStep/(k+2*this.limitMotor3.dampingRatio*omega);
	            this.cfm3=this.kv22*dmp;
	            this.limitVelocity3*=k*dmp;
	        }else{
	            this.cfm3=0;
	            this.limitVelocity3*=invTimeStep*0.05;
	        }

	        this.k00+=this.cfm1;
	        this.k11+=this.cfm2;
	        this.k22+=this.cfm3;

	        var inv=1/(
	        this.k00*(this.k11*this.k22-this.k21*this.k12)+
	        this.k10*(this.k21*this.k02-this.k01*this.k22)+
	        this.k20*(this.k01*this.k12-this.k11*this.k02)
	        );
	        this.d00=(this.k11*this.k22-this.k12*this.k21)*inv;
	        this.d01=(this.k02*this.k21-this.k01*this.k22)*inv;
	        this.d02=(this.k01*this.k12-this.k02*this.k11)*inv;
	        this.d10=(this.k12*this.k20-this.k10*this.k22)*inv;
	        this.d11=(this.k00*this.k22-this.k02*this.k20)*inv;
	        this.d12=(this.k02*this.k10-this.k00*this.k12)*inv;
	        this.d20=(this.k10*this.k21-this.k11*this.k20)*inv;
	        this.d21=(this.k01*this.k20-this.k00*this.k21)*inv;
	        this.d22=(this.k00*this.k11-this.k01*this.k10)*inv;
	        
	        this.limitImpulse1*=0.95;
	        this.motorImpulse1*=0.95;
	        this.limitImpulse2*=0.95;
	        this.motorImpulse2*=0.95;
	        this.limitImpulse3*=0.95;
	        this.motorImpulse3*=0.95;
	        var totalImpulse1=this.limitImpulse1+this.motorImpulse1;
	        var totalImpulse2=this.limitImpulse2+this.motorImpulse2;
	        var totalImpulse3=this.limitImpulse3+this.motorImpulse3;
	        this.a1.x+=totalImpulse1*this.a1x1+totalImpulse2*this.a1x2+totalImpulse3*this.a1x3;
	        this.a1.y+=totalImpulse1*this.a1y1+totalImpulse2*this.a1y2+totalImpulse3*this.a1y3;
	        this.a1.z+=totalImpulse1*this.a1z1+totalImpulse2*this.a1z2+totalImpulse3*this.a1z3;
	        this.a2.x-=totalImpulse1*this.a2x1+totalImpulse2*this.a2x2+totalImpulse3*this.a2x3;
	        this.a2.y-=totalImpulse1*this.a2y1+totalImpulse2*this.a2y2+totalImpulse3*this.a2y3;
	        this.a2.z-=totalImpulse1*this.a2z1+totalImpulse2*this.a2z2+totalImpulse3*this.a2z3;
	    },
	    solve_:function(){

	        var rvx=this.a2.x-this.a1.x;
	        var rvy=this.a2.y-this.a1.y;
	        var rvz=this.a2.z-this.a1.z;

	        this.limitVelocity3=30;
	        var rvn1=rvx*this.ax1+rvy*this.ay1+rvz*this.az1-this.limitVelocity1;
	        var rvn2=rvx*this.ax2+rvy*this.ay2+rvz*this.az2-this.limitVelocity2;
	        var rvn3=rvx*this.ax3+rvy*this.ay3+rvz*this.az3-this.limitVelocity3;

	        var dLimitImpulse1=rvn1*this.d00+rvn2*this.d01+rvn3*this.d02;
	        var dLimitImpulse2=rvn1*this.d10+rvn2*this.d11+rvn3*this.d12;
	        var dLimitImpulse3=rvn1*this.d20+rvn2*this.d21+rvn3*this.d22;

	        this.limitImpulse1+=dLimitImpulse1;
	        this.limitImpulse2+=dLimitImpulse2;
	        this.limitImpulse3+=dLimitImpulse3;

	        this.a1.x+=dLimitImpulse1*this.a1x1+dLimitImpulse2*this.a1x2+dLimitImpulse3*this.a1x3;
	        this.a1.y+=dLimitImpulse1*this.a1y1+dLimitImpulse2*this.a1y2+dLimitImpulse3*this.a1y3;
	        this.a1.z+=dLimitImpulse1*this.a1z1+dLimitImpulse2*this.a1z2+dLimitImpulse3*this.a1z3;
	        this.a2.x-=dLimitImpulse1*this.a2x1+dLimitImpulse2*this.a2x2+dLimitImpulse3*this.a2x3;
	        this.a2.y-=dLimitImpulse1*this.a2y1+dLimitImpulse2*this.a2y2+dLimitImpulse3*this.a2y3;
	        this.a2.z-=dLimitImpulse1*this.a2z1+dLimitImpulse2*this.a2z2+dLimitImpulse3*this.a2z3;
	    },
	    solve:function(){

	        var rvx=this.a2.x-this.a1.x;
	        var rvy=this.a2.y-this.a1.y;
	        var rvz=this.a2.z-this.a1.z;

	        var rvn1=rvx*this.ax1+rvy*this.ay1+rvz*this.az1;
	        var rvn2=rvx*this.ax2+rvy*this.ay2+rvz*this.az2;
	        var rvn3=rvx*this.ax3+rvy*this.ay3+rvz*this.az3;

	        var oldMotorImpulse1=this.motorImpulse1;
	        var oldMotorImpulse2=this.motorImpulse2;
	        var oldMotorImpulse3=this.motorImpulse3;

	        var dMotorImpulse1=0;
	        var dMotorImpulse2=0;
	        var dMotorImpulse3=0;

	        if(this.enableMotor1){
	            dMotorImpulse1=(rvn1-this.motorSpeed1)*this.dv00;
	            this.motorImpulse1+=dMotorImpulse1;
	            if(this.motorImpulse1>this.maxMotorImpulse1){ // clamp motor impulse
	            this.motorImpulse1=this.maxMotorImpulse1;
	            }else if(this.motorImpulse1<-this.maxMotorImpulse1){
	            this.motorImpulse1=-this.maxMotorImpulse1;
	            }
	            dMotorImpulse1=this.motorImpulse1-oldMotorImpulse1;
	        }
	        if(this.enableMotor2){
	            dMotorImpulse2=(rvn2-this.motorSpeed2)*this.dv11;
	            this.motorImpulse2+=dMotorImpulse2;
	            if(this.motorImpulse2>this.maxMotorImpulse2){ // clamp motor impulse
	                this.motorImpulse2=this.maxMotorImpulse2;
	            }else if(this.motorImpulse2<-this.maxMotorImpulse2){
	                this.motorImpulse2=-this.maxMotorImpulse2;
	            }
	            dMotorImpulse2=this.motorImpulse2-oldMotorImpulse2;
	        }
	        if(this.enableMotor3){
	            dMotorImpulse3=(rvn3-this.motorSpeed3)*this.dv22;
	            this.motorImpulse3+=dMotorImpulse3;
	            if(this.motorImpulse3>this.maxMotorImpulse3){ // clamp motor impulse
	                this.motorImpulse3=this.maxMotorImpulse3;
	            }else if(this.motorImpulse3<-this.maxMotorImpulse3){
	                this.motorImpulse3=-this.maxMotorImpulse3;
	            }
	            dMotorImpulse3=this.motorImpulse3-oldMotorImpulse3;
	        }

	        // apply motor impulse to relative velocity
	        rvn1+=dMotorImpulse1*this.kv00+dMotorImpulse2*this.k01+dMotorImpulse3*this.k02;
	        rvn2+=dMotorImpulse1*this.k10+dMotorImpulse2*this.kv11+dMotorImpulse3*this.k12;
	        rvn3+=dMotorImpulse1*this.k20+dMotorImpulse2*this.k21+dMotorImpulse3*this.kv22;

	        // subtract target velocity and applied impulse
	        rvn1-=this.limitVelocity1+this.limitImpulse1*this.cfm1;
	        rvn2-=this.limitVelocity2+this.limitImpulse2*this.cfm2;
	        rvn3-=this.limitVelocity3+this.limitImpulse3*this.cfm3;

	        var oldLimitImpulse1=this.limitImpulse1;
	        var oldLimitImpulse2=this.limitImpulse2;
	        var oldLimitImpulse3=this.limitImpulse3;

	        var dLimitImpulse1=rvn1*this.d00+rvn2*this.d01+rvn3*this.d02;
	        var dLimitImpulse2=rvn1*this.d10+rvn2*this.d11+rvn3*this.d12;
	        var dLimitImpulse3=rvn1*this.d20+rvn2*this.d21+rvn3*this.d22;

	        this.limitImpulse1+=dLimitImpulse1;
	        this.limitImpulse2+=dLimitImpulse2;
	        this.limitImpulse3+=dLimitImpulse3;

	        // clamp
	        var clampState=0;
	        if(this.limitState1==2||this.limitImpulse1*this.limitState1<0){
	            dLimitImpulse1=-oldLimitImpulse1;
	            rvn2+=dLimitImpulse1*this.k10;
	            rvn3+=dLimitImpulse1*this.k20;
	            clampState|=1;
	        }
	        if(this.limitState2==2||this.limitImpulse2*this.limitState2<0){
	            dLimitImpulse2=-oldLimitImpulse2;
	            rvn1+=dLimitImpulse2*this.k01;
	            rvn3+=dLimitImpulse2*this.k21;
	            clampState|=2;
	        }
	        if(this.limitState3==2||this.limitImpulse3*this.limitState3<0){
	            dLimitImpulse3=-oldLimitImpulse3;
	            rvn1+=dLimitImpulse3*this.k02;
	            rvn2+=dLimitImpulse3*this.k12;
	            clampState|=4;
	        }

	        // update un-clamped impulse
	        // TODO: isolate division
	        var det;
	        switch(clampState){
	            case 1: // update 2 3
	            det=1/(this.k11*this.k22-this.k12*this.k21);
	            dLimitImpulse2=(this.k22*rvn2+-this.k12*rvn3)*det;
	            dLimitImpulse3=(-this.k21*rvn2+this.k11*rvn3)*det;
	            break;
	            case 2: // update 1 3
	            det=1/(this.k00*this.k22-this.k02*this.k20);
	            dLimitImpulse1=(this.k22*rvn1+-this.k02*rvn3)*det;
	            dLimitImpulse3=(-this.k20*rvn1+this.k00*rvn3)*det;
	            break;
	            case 3: // update 3
	            dLimitImpulse3=rvn3/this.k22;
	            break;
	            case 4: // update 1 2
	            det=1/(this.k00*this.k11-this.k01*this.k10);
	            dLimitImpulse1=(this.k11*rvn1+-this.k01*rvn2)*det;
	            dLimitImpulse2=(-this.k10*rvn1+this.k00*rvn2)*det;
	            break;
	            case 5: // update 2
	            dLimitImpulse2=rvn2/this.k11;
	            break;
	            case 6: // update 1
	            dLimitImpulse1=rvn1/this.k00;
	            break;
	        }

	        this.limitImpulse1=dLimitImpulse1+oldLimitImpulse1;
	        this.limitImpulse2=dLimitImpulse2+oldLimitImpulse2;
	        this.limitImpulse3=dLimitImpulse3+oldLimitImpulse3;

	        var dImpulse1=dMotorImpulse1+dLimitImpulse1;
	        var dImpulse2=dMotorImpulse2+dLimitImpulse2;
	        var dImpulse3=dMotorImpulse3+dLimitImpulse3;

	        // apply impulse
	        this.a1.x+=dImpulse1*this.a1x1+dImpulse2*this.a1x2+dImpulse3*this.a1x3;
	        this.a1.y+=dImpulse1*this.a1y1+dImpulse2*this.a1y2+dImpulse3*this.a1y3;
	        this.a1.z+=dImpulse1*this.a1z1+dImpulse2*this.a1z2+dImpulse3*this.a1z3;
	        this.a2.x-=dImpulse1*this.a2x1+dImpulse2*this.a2x2+dImpulse3*this.a2x3;
	        this.a2.y-=dImpulse1*this.a2y1+dImpulse2*this.a2y2+dImpulse3*this.a2y3;
	        this.a2.z-=dImpulse1*this.a2z1+dImpulse2*this.a2z2+dImpulse3*this.a2z3;
	        rvx=this.a2.x-this.a1.x;
	        rvy=this.a2.y-this.a1.y;
	        rvz=this.a2.z-this.a1.z;

	        rvn2=rvx*this.ax2+rvy*this.ay2+rvz*this.az2;
	    }
	    
	} );

	/**
	 * A hinge joint allows only for relative rotation of rigid bodies along the axis.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function HingeJoint ( config, lowerAngleLimit, upperAngleLimit ) {

	    Joint.call( this, config );

	    this.type = JOINT_HINGE;

	    // The axis in the first body's coordinate system.
	    this.localAxis1 = config.localAxis1.clone().normalize();
	    // The axis in the second body's coordinate system.
	    this.localAxis2 = config.localAxis2.clone().normalize();

	    // make angle axis
	    var arc = new Mat33().setQuat( new Quat().setFromUnitVectors( this.localAxis1, this.localAxis2 ) );
	    this.localAngle1 = new Vec3().tangent( this.localAxis1 ).normalize();
	    this.localAngle2 = this.localAngle1.clone().applyMatrix3( arc, true );

	    this.ax1 = new Vec3();
	    this.ax2 = new Vec3();
	    this.an1 = new Vec3();
	    this.an2 = new Vec3();

	    this.tmp = new Vec3();

	    this.nor = new Vec3();
	    this.tan = new Vec3();
	    this.bin = new Vec3();

	    // The rotational limit and motor information of the joint.
	    this.limitMotor = new LimitMotor( this.nor, false );
	    this.limitMotor.lowerLimit = lowerAngleLimit;
	    this.limitMotor.upperLimit = upperAngleLimit;

	    this.lc = new LinearConstraint( this );
	    this.r3 = new Rotational3Constraint( this, this.limitMotor, new LimitMotor( this.tan, true ), new LimitMotor( this.bin, true ) );
	}

	HingeJoint.prototype = Object.assign( Object.create( Joint.prototype ), {

	    constructor: HingeJoint,


	    preSolve: function ( timeStep, invTimeStep ) {

	        this.updateAnchorPoints();

	        this.ax1.copy( this.localAxis1 ).applyMatrix3( this.body1.rotation, true );
	        this.ax2.copy( this.localAxis2 ).applyMatrix3( this.body2.rotation, true );

	        this.an1.copy( this.localAngle1 ).applyMatrix3( this.body1.rotation, true );
	        this.an2.copy( this.localAngle2 ).applyMatrix3( this.body2.rotation, true );

	        // normal tangent binormal

	        this.nor.set(
	            this.ax1.x*this.body2.inverseMass + this.ax2.x*this.body1.inverseMass,
	            this.ax1.y*this.body2.inverseMass + this.ax2.y*this.body1.inverseMass,
	            this.ax1.z*this.body2.inverseMass + this.ax2.z*this.body1.inverseMass
	        ).normalize();

	        this.tan.tangent( this.nor ).normalize();

	        this.bin.crossVectors( this.nor, this.tan );

	        // calculate hinge angle

	        var limite = _Math.acosClamp( _Math.dotVectors( this.an1, this.an2 ) );

	        this.tmp.crossVectors( this.an1, this.an2 );

	        if( _Math.dotVectors( this.nor, this.tmp ) < 0 ) this.limitMotor.angle = -limite;
	        else this.limitMotor.angle = limite;

	        this.tmp.crossVectors( this.ax1, this.ax2 );

	        this.r3.limitMotor2.angle = _Math.dotVectors( this.tan, this.tmp );
	        this.r3.limitMotor3.angle = _Math.dotVectors( this.bin, this.tmp );

	        // preSolve
	        
	        this.r3.preSolve( timeStep, invTimeStep );
	        this.lc.preSolve( timeStep, invTimeStep );

	    },

	    solve: function () {

	        this.r3.solve();
	        this.lc.solve();

	    },

	    postSolve: function () {

	    }

	});

	/**
	 * A ball-and-socket joint limits relative translation on two anchor points on rigid bodies.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function BallAndSocketJoint ( config ){

	    Joint.call( this, config );

	    this.type = JOINT_BALL_AND_SOCKET;
	    
	    this.lc = new LinearConstraint( this );

	}

	BallAndSocketJoint.prototype = Object.assign( Object.create( Joint.prototype ), {

	    constructor: BallAndSocketJoint,

	    preSolve: function ( timeStep, invTimeStep ) {

	        this.updateAnchorPoints();

	        // preSolve

	        this.lc.preSolve( timeStep, invTimeStep );

	    },

	    solve: function () {

	        this.lc.solve();

	    },

	    postSolve: function () {

	    }

	});

	/**
	* A translational constraint for various joints.
	* @author saharan
	*/
	function TranslationalConstraint ( joint, limitMotor ){
	    this.cfm=NaN;
	    this.m1=NaN;
	    this.m2=NaN;
	    this.i1e00=NaN;
	    this.i1e01=NaN;
	    this.i1e02=NaN;
	    this.i1e10=NaN;
	    this.i1e11=NaN;
	    this.i1e12=NaN;
	    this.i1e20=NaN;
	    this.i1e21=NaN;
	    this.i1e22=NaN;
	    this.i2e00=NaN;
	    this.i2e01=NaN;
	    this.i2e02=NaN;
	    this.i2e10=NaN;
	    this.i2e11=NaN;
	    this.i2e12=NaN;
	    this.i2e20=NaN;
	    this.i2e21=NaN;
	    this.i2e22=NaN;
	    this.motorDenom=NaN;
	    this.invMotorDenom=NaN;
	    this.invDenom=NaN;
	    this.ax=NaN;
	    this.ay=NaN;
	    this.az=NaN;
	    this.r1x=NaN;
	    this.r1y=NaN;
	    this.r1z=NaN;
	    this.r2x=NaN;
	    this.r2y=NaN;
	    this.r2z=NaN;
	    this.t1x=NaN;
	    this.t1y=NaN;
	    this.t1z=NaN;
	    this.t2x=NaN;
	    this.t2y=NaN;
	    this.t2z=NaN;
	    this.l1x=NaN;
	    this.l1y=NaN;
	    this.l1z=NaN;
	    this.l2x=NaN;
	    this.l2y=NaN;
	    this.l2z=NaN;
	    this.a1x=NaN;
	    this.a1y=NaN;
	    this.a1z=NaN;
	    this.a2x=NaN;
	    this.a2y=NaN;
	    this.a2z=NaN;
	    this.lowerLimit=NaN;
	    this.upperLimit=NaN;
	    this.limitVelocity=NaN;
	    this.limitState=0; // -1: at lower, 0: locked, 1: at upper, 2: free
	    this.enableMotor=false;
	    this.motorSpeed=NaN;
	    this.maxMotorForce=NaN;
	    this.maxMotorImpulse=NaN;

	    this.limitMotor=limitMotor;
	    this.b1=joint.body1;
	    this.b2=joint.body2;
	    this.p1=joint.anchorPoint1;
	    this.p2=joint.anchorPoint2;
	    this.r1=joint.relativeAnchorPoint1;
	    this.r2=joint.relativeAnchorPoint2;
	    this.l1=this.b1.linearVelocity;
	    this.l2=this.b2.linearVelocity;
	    this.a1=this.b1.angularVelocity;
	    this.a2=this.b2.angularVelocity;
	    this.i1=this.b1.inverseInertia;
	    this.i2=this.b2.inverseInertia;
	    this.limitImpulse=0;
	    this.motorImpulse=0;
	}

	Object.assign( TranslationalConstraint.prototype, {

	    TranslationalConstraint: true,

	    preSolve:function(timeStep,invTimeStep){
	        this.ax=this.limitMotor.axis.x;
	        this.ay=this.limitMotor.axis.y;
	        this.az=this.limitMotor.axis.z;
	        this.lowerLimit=this.limitMotor.lowerLimit;
	        this.upperLimit=this.limitMotor.upperLimit;
	        this.motorSpeed=this.limitMotor.motorSpeed;
	        this.maxMotorForce=this.limitMotor.maxMotorForce;
	        this.enableMotor=this.maxMotorForce>0;
	        this.m1=this.b1.inverseMass;
	        this.m2=this.b2.inverseMass;

	        var ti1 = this.i1.elements;
	        var ti2 = this.i2.elements;
	        this.i1e00=ti1[0];
	        this.i1e01=ti1[1];
	        this.i1e02=ti1[2];
	        this.i1e10=ti1[3];
	        this.i1e11=ti1[4];
	        this.i1e12=ti1[5];
	        this.i1e20=ti1[6];
	        this.i1e21=ti1[7];
	        this.i1e22=ti1[8];

	        this.i2e00=ti2[0];
	        this.i2e01=ti2[1];
	        this.i2e02=ti2[2];
	        this.i2e10=ti2[3];
	        this.i2e11=ti2[4];
	        this.i2e12=ti2[5];
	        this.i2e20=ti2[6];
	        this.i2e21=ti2[7];
	        this.i2e22=ti2[8];

	        var dx=this.p2.x-this.p1.x;
	        var dy=this.p2.y-this.p1.y;
	        var dz=this.p2.z-this.p1.z;
	        var d=dx*this.ax+dy*this.ay+dz*this.az;
	        var frequency=this.limitMotor.frequency;
	        var enableSpring=frequency>0;
	        var enableLimit=this.lowerLimit<=this.upperLimit;
	        if(enableSpring&&d>20||d<-20){
	            enableSpring=false;
	        }

	        if(enableLimit){
	            if(this.lowerLimit==this.upperLimit){
	                if(this.limitState!=0){
	                    this.limitState=0;
	                    this.limitImpulse=0;
	                }
	                this.limitVelocity=this.lowerLimit-d;
	                if(!enableSpring)d=this.lowerLimit;
	            }else if(d<this.lowerLimit){
	                if(this.limitState!=-1){
	                    this.limitState=-1;
	                    this.limitImpulse=0;
	                }
	                this.limitVelocity=this.lowerLimit-d;
	                if(!enableSpring)d=this.lowerLimit;
	            }else if(d>this.upperLimit){
	                if(this.limitState!=1){
	                    this.limitState=1;
	                    this.limitImpulse=0;
	                }
	                this.limitVelocity=this.upperLimit-d;
	                if(!enableSpring)d=this.upperLimit;
	            }else{
	                this.limitState=2;
	                this.limitImpulse=0;
	                this.limitVelocity=0;
	            }
	            if(!enableSpring){
	                if(this.limitVelocity>0.005)this.limitVelocity-=0.005;
	                else if(this.limitVelocity<-0.005)this.limitVelocity+=0.005;
	                else this.limitVelocity=0;
	            }
	        }else{
	            this.limitState=2;
	            this.limitImpulse=0;
	        }

	        if(this.enableMotor&&(this.limitState!=0||enableSpring)){
	            this.maxMotorImpulse=this.maxMotorForce*timeStep;
	        }else{
	            this.motorImpulse=0;
	            this.maxMotorImpulse=0;
	        }

	        var rdx=d*this.ax;
	        var rdy=d*this.ay;
	        var rdz=d*this.az;
	        var w1=this.m1/(this.m1+this.m2);
	        var w2=1-w1;
	        this.r1x=this.r1.x+rdx*w1;
	        this.r1y=this.r1.y+rdy*w1;
	        this.r1z=this.r1.z+rdz*w1;
	        this.r2x=this.r2.x-rdx*w2;
	        this.r2y=this.r2.y-rdy*w2;
	        this.r2z=this.r2.z-rdz*w2;

	        this.t1x=this.r1y*this.az-this.r1z*this.ay;
	        this.t1y=this.r1z*this.ax-this.r1x*this.az;
	        this.t1z=this.r1x*this.ay-this.r1y*this.ax;
	        this.t2x=this.r2y*this.az-this.r2z*this.ay;
	        this.t2y=this.r2z*this.ax-this.r2x*this.az;
	        this.t2z=this.r2x*this.ay-this.r2y*this.ax;
	        this.l1x=this.ax*this.m1;
	        this.l1y=this.ay*this.m1;
	        this.l1z=this.az*this.m1;
	        this.l2x=this.ax*this.m2;
	        this.l2y=this.ay*this.m2;
	        this.l2z=this.az*this.m2;
	        this.a1x=this.t1x*this.i1e00+this.t1y*this.i1e01+this.t1z*this.i1e02;
	        this.a1y=this.t1x*this.i1e10+this.t1y*this.i1e11+this.t1z*this.i1e12;
	        this.a1z=this.t1x*this.i1e20+this.t1y*this.i1e21+this.t1z*this.i1e22;
	        this.a2x=this.t2x*this.i2e00+this.t2y*this.i2e01+this.t2z*this.i2e02;
	        this.a2y=this.t2x*this.i2e10+this.t2y*this.i2e11+this.t2z*this.i2e12;
	        this.a2z=this.t2x*this.i2e20+this.t2y*this.i2e21+this.t2z*this.i2e22;
	        this.motorDenom=
	        this.m1+this.m2+
	            this.ax*(this.a1y*this.r1z-this.a1z*this.r1y+this.a2y*this.r2z-this.a2z*this.r2y)+
	            this.ay*(this.a1z*this.r1x-this.a1x*this.r1z+this.a2z*this.r2x-this.a2x*this.r2z)+
	            this.az*(this.a1x*this.r1y-this.a1y*this.r1x+this.a2x*this.r2y-this.a2y*this.r2x);

	        this.invMotorDenom=1/this.motorDenom;

	        if(enableSpring&&this.limitState!=2){
	            var omega=6.2831853*frequency;
	            var k=omega*omega*timeStep;
	            var dmp=invTimeStep/(k+2*this.limitMotor.dampingRatio*omega);
	            this.cfm=this.motorDenom*dmp;
	            this.limitVelocity*=k*dmp;
	        }else{
	            this.cfm=0;
	            this.limitVelocity*=invTimeStep*0.05;
	        }

	        this.invDenom=1/(this.motorDenom+this.cfm);

	        var totalImpulse=this.limitImpulse+this.motorImpulse;
	        this.l1.x+=totalImpulse*this.l1x;
	        this.l1.y+=totalImpulse*this.l1y;
	        this.l1.z+=totalImpulse*this.l1z;
	        this.a1.x+=totalImpulse*this.a1x;
	        this.a1.y+=totalImpulse*this.a1y;
	        this.a1.z+=totalImpulse*this.a1z;
	        this.l2.x-=totalImpulse*this.l2x;
	        this.l2.y-=totalImpulse*this.l2y;
	        this.l2.z-=totalImpulse*this.l2z;
	        this.a2.x-=totalImpulse*this.a2x;
	        this.a2.y-=totalImpulse*this.a2y;
	        this.a2.z-=totalImpulse*this.a2z;
	    },
	    solve:function(){
	        var rvn=
	            this.ax*(this.l2.x-this.l1.x)+this.ay*(this.l2.y-this.l1.y)+this.az*(this.l2.z-this.l1.z)+
	            this.t2x*this.a2.x-this.t1x*this.a1.x+this.t2y*this.a2.y-this.t1y*this.a1.y+this.t2z*this.a2.z-this.t1z*this.a1.z;

	        // motor part
	        var newMotorImpulse;
	        if(this.enableMotor){
	            newMotorImpulse=(rvn-this.motorSpeed)*this.invMotorDenom;
	            var oldMotorImpulse=this.motorImpulse;
	            this.motorImpulse+=newMotorImpulse;
	            if(this.motorImpulse>this.maxMotorImpulse)this.motorImpulse=this.maxMotorImpulse;
	            else if(this.motorImpulse<-this.maxMotorImpulse)this.motorImpulse=-this.maxMotorImpulse;
	            newMotorImpulse=this.motorImpulse-oldMotorImpulse;
	            rvn-=newMotorImpulse*this.motorDenom;
	        }else newMotorImpulse=0;

	        // limit part
	        var newLimitImpulse;
	        if(this.limitState!=2){
	            newLimitImpulse=(rvn-this.limitVelocity-this.limitImpulse*this.cfm)*this.invDenom;
	            var oldLimitImpulse=this.limitImpulse;
	            this.limitImpulse+=newLimitImpulse;
	            if(this.limitImpulse*this.limitState<0)this.limitImpulse=0;
	            newLimitImpulse=this.limitImpulse-oldLimitImpulse;
	        }else newLimitImpulse=0;
	        
	        var totalImpulse=newLimitImpulse+newMotorImpulse;
	        this.l1.x+=totalImpulse*this.l1x;
	        this.l1.y+=totalImpulse*this.l1y;
	        this.l1.z+=totalImpulse*this.l1z;
	        this.a1.x+=totalImpulse*this.a1x;
	        this.a1.y+=totalImpulse*this.a1y;
	        this.a1.z+=totalImpulse*this.a1z;
	        this.l2.x-=totalImpulse*this.l2x;
	        this.l2.y-=totalImpulse*this.l2y;
	        this.l2.z-=totalImpulse*this.l2z;
	        this.a2.x-=totalImpulse*this.a2x;
	        this.a2.y-=totalImpulse*this.a2y;
	        this.a2.z-=totalImpulse*this.a2z;
	    }
	} );

	/**
	 * A distance joint limits the distance between two anchor points on rigid bodies.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function DistanceJoint ( config, minDistance, maxDistance ){

	    Joint.call( this, config );

	    this.type = JOINT_DISTANCE;
	    
	    this.nor = new Vec3();

	    // The limit and motor information of the joint.
	    this.limitMotor = new LimitMotor( this.nor, true );
	    this.limitMotor.lowerLimit = minDistance;
	    this.limitMotor.upperLimit = maxDistance;

	    this.t = new TranslationalConstraint( this, this.limitMotor );

	}

	DistanceJoint.prototype = Object.assign( Object.create( Joint.prototype ), {

	    constructor: DistanceJoint,

	    preSolve: function ( timeStep, invTimeStep ) {

	        this.updateAnchorPoints();

	        this.nor.sub( this.anchorPoint2, this.anchorPoint1 ).normalize();

	        // preSolve

	        this.t.preSolve( timeStep, invTimeStep );

	    },

	    solve: function () {

	        this.t.solve();

	    },

	    postSolve: function () {

	    }

	});

	/**
	* An angular constraint for all axes for various joints.
	* @author saharan
	*/

	function AngularConstraint( joint, targetOrientation ) {

	    this.joint = joint;

	    this.targetOrientation = new Quat().invert( targetOrientation );

	    this.relativeOrientation = new Quat();

	    this.ii1 = null;
	    this.ii2 = null;
	    this.dd = null;

	    this.vel = new Vec3();
	    this.imp = new Vec3();

	    this.rn0 = new Vec3();
	    this.rn1 = new Vec3();
	    this.rn2 = new Vec3();

	    this.b1 = joint.body1;
	    this.b2 = joint.body2;
	    this.a1 = this.b1.angularVelocity;
	    this.a2 = this.b2.angularVelocity;
	    this.i1 = this.b1.inverseInertia;
	    this.i2 = this.b2.inverseInertia;

	}

	Object.assign( AngularConstraint.prototype, {

	    AngularConstraint: true,

	    preSolve: function ( timeStep, invTimeStep ) {

	        var inv, len, v;

	        this.ii1 = this.i1.clone();
	        this.ii2 = this.i2.clone();

	        v = new Mat33().add(this.ii1, this.ii2).elements;
	        inv = 1/( v[0]*(v[4]*v[8]-v[7]*v[5])  +  v[3]*(v[7]*v[2]-v[1]*v[8])  +  v[6]*(v[1]*v[5]-v[4]*v[2]) );
	        this.dd = new Mat33().set(
	            v[4]*v[8]-v[5]*v[7], v[2]*v[7]-v[1]*v[8], v[1]*v[5]-v[2]*v[4],
	            v[5]*v[6]-v[3]*v[8], v[0]*v[8]-v[2]*v[6], v[2]*v[3]-v[0]*v[5],
	            v[3]*v[7]-v[4]*v[6], v[1]*v[6]-v[0]*v[7], v[0]*v[4]-v[1]*v[3]
	        ).multiplyScalar( inv );
	        
	        this.relativeOrientation.invert( this.b1.orientation ).multiply( this.targetOrientation ).multiply( this.b2.orientation );

	        inv = this.relativeOrientation.w*2;

	        this.vel.copy( this.relativeOrientation ).multiplyScalar( inv );

	        len = this.vel.length();

	        if( len > 0.02 ) {
	            len = (0.02-len)/len*invTimeStep*0.05;
	            this.vel.multiplyScalar( len );
	        }else{
	            this.vel.set(0,0,0);
	        }

	        this.rn1.copy( this.imp ).applyMatrix3( this.ii1, true );
	        this.rn2.copy( this.imp ).applyMatrix3( this.ii2, true );

	        this.a1.add( this.rn1 );
	        this.a2.sub( this.rn2 );

	    },

	    solve: function () {

	        var r = this.a2.clone().sub( this.a1 ).sub( this.vel );

	        this.rn0.copy( r ).applyMatrix3( this.dd, true );
	        this.rn1.copy( this.rn0 ).applyMatrix3( this.ii1, true );
	        this.rn2.copy( this.rn0 ).applyMatrix3( this.ii2, true );

	        this.imp.add( this.rn0 );
	        this.a1.add( this.rn1 );
	        this.a2.sub( this.rn2 );

	    }

	} );

	/**
	* A three-axis translational constraint for various joints.
	* @author saharan
	*/
	function Translational3Constraint (joint,limitMotor1,limitMotor2,limitMotor3){

	    this.m1=NaN;
	    this.m2=NaN;
	    this.i1e00=NaN;
	    this.i1e01=NaN;
	    this.i1e02=NaN;
	    this.i1e10=NaN;
	    this.i1e11=NaN;
	    this.i1e12=NaN;
	    this.i1e20=NaN;
	    this.i1e21=NaN;
	    this.i1e22=NaN;
	    this.i2e00=NaN;
	    this.i2e01=NaN;
	    this.i2e02=NaN;
	    this.i2e10=NaN;
	    this.i2e11=NaN;
	    this.i2e12=NaN;
	    this.i2e20=NaN;
	    this.i2e21=NaN;
	    this.i2e22=NaN;
	    this.ax1=NaN;
	    this.ay1=NaN;
	    this.az1=NaN;
	    this.ax2=NaN;
	    this.ay2=NaN;
	    this.az2=NaN;
	    this.ax3=NaN;
	    this.ay3=NaN;
	    this.az3=NaN;
	    this.r1x=NaN;
	    this.r1y=NaN;
	    this.r1z=NaN;
	    this.r2x=NaN;
	    this.r2y=NaN;
	    this.r2z=NaN;
	    this.t1x1=NaN;// jacobians
	    this.t1y1=NaN;
	    this.t1z1=NaN;
	    this.t2x1=NaN;
	    this.t2y1=NaN;
	    this.t2z1=NaN;
	    this.l1x1=NaN;
	    this.l1y1=NaN;
	    this.l1z1=NaN;
	    this.l2x1=NaN;
	    this.l2y1=NaN;
	    this.l2z1=NaN;
	    this.a1x1=NaN;
	    this.a1y1=NaN;
	    this.a1z1=NaN;
	    this.a2x1=NaN;
	    this.a2y1=NaN;
	    this.a2z1=NaN;
	    this.t1x2=NaN;
	    this.t1y2=NaN;
	    this.t1z2=NaN;
	    this.t2x2=NaN;
	    this.t2y2=NaN;
	    this.t2z2=NaN;
	    this.l1x2=NaN;
	    this.l1y2=NaN;
	    this.l1z2=NaN;
	    this.l2x2=NaN;
	    this.l2y2=NaN;
	    this.l2z2=NaN;
	    this.a1x2=NaN;
	    this.a1y2=NaN;
	    this.a1z2=NaN;
	    this.a2x2=NaN;
	    this.a2y2=NaN;
	    this.a2z2=NaN;
	    this.t1x3=NaN;
	    this.t1y3=NaN;
	    this.t1z3=NaN;
	    this.t2x3=NaN;
	    this.t2y3=NaN;
	    this.t2z3=NaN;
	    this.l1x3=NaN;
	    this.l1y3=NaN;
	    this.l1z3=NaN;
	    this.l2x3=NaN;
	    this.l2y3=NaN;
	    this.l2z3=NaN;
	    this.a1x3=NaN;
	    this.a1y3=NaN;
	    this.a1z3=NaN;
	    this.a2x3=NaN;
	    this.a2y3=NaN;
	    this.a2z3=NaN;
	    this.lowerLimit1=NaN;
	    this.upperLimit1=NaN;
	    this.limitVelocity1=NaN;
	    this.limitState1=0; // -1: at lower, 0: locked, 1: at upper, 2: unlimited
	    this.enableMotor1=false;
	    this.motorSpeed1=NaN;
	    this.maxMotorForce1=NaN;
	    this.maxMotorImpulse1=NaN;
	    this.lowerLimit2=NaN;
	    this.upperLimit2=NaN;
	    this.limitVelocity2=NaN;
	    this.limitState2=0; // -1: at lower, 0: locked, 1: at upper, 2: unlimited
	    this.enableMotor2=false;
	    this.motorSpeed2=NaN;
	    this.maxMotorForce2=NaN;
	    this.maxMotorImpulse2=NaN;
	    this.lowerLimit3=NaN;
	    this.upperLimit3=NaN;
	    this.limitVelocity3=NaN;
	    this.limitState3=0; // -1: at lower, 0: locked, 1: at upper, 2: unlimited
	    this.enableMotor3=false;
	    this.motorSpeed3=NaN;
	    this.maxMotorForce3=NaN;
	    this.maxMotorImpulse3=NaN;
	    this.k00=NaN; // K = J*M*JT
	    this.k01=NaN;
	    this.k02=NaN;
	    this.k10=NaN;
	    this.k11=NaN;
	    this.k12=NaN;
	    this.k20=NaN;
	    this.k21=NaN;
	    this.k22=NaN;
	    this.kv00=NaN; // diagonals without CFMs
	    this.kv11=NaN;
	    this.kv22=NaN;
	    this.dv00=NaN; // ...inverted
	    this.dv11=NaN;
	    this.dv22=NaN;
	    this.d00=NaN; // K^-1
	    this.d01=NaN;
	    this.d02=NaN;
	    this.d10=NaN;
	    this.d11=NaN;
	    this.d12=NaN;
	    this.d20=NaN;
	    this.d21=NaN;
	    this.d22=NaN;

	    this.limitMotor1=limitMotor1;
	    this.limitMotor2=limitMotor2;
	    this.limitMotor3=limitMotor3;
	    this.b1=joint.body1;
	    this.b2=joint.body2;
	    this.p1=joint.anchorPoint1;
	    this.p2=joint.anchorPoint2;
	    this.r1=joint.relativeAnchorPoint1;
	    this.r2=joint.relativeAnchorPoint2;
	    this.l1=this.b1.linearVelocity;
	    this.l2=this.b2.linearVelocity;
	    this.a1=this.b1.angularVelocity;
	    this.a2=this.b2.angularVelocity;
	    this.i1=this.b1.inverseInertia;
	    this.i2=this.b2.inverseInertia;
	    this.limitImpulse1=0;
	    this.motorImpulse1=0;
	    this.limitImpulse2=0;
	    this.motorImpulse2=0;
	    this.limitImpulse3=0;
	    this.motorImpulse3=0;
	    this.cfm1=0;// Constraint Force Mixing
	    this.cfm2=0;
	    this.cfm3=0;
	    this.weight=-1;
	}

	Object.assign( Translational3Constraint.prototype, {

	    Translational3Constraint: true,

	    preSolve:function(timeStep,invTimeStep){
	        this.ax1=this.limitMotor1.axis.x;
	        this.ay1=this.limitMotor1.axis.y;
	        this.az1=this.limitMotor1.axis.z;
	        this.ax2=this.limitMotor2.axis.x;
	        this.ay2=this.limitMotor2.axis.y;
	        this.az2=this.limitMotor2.axis.z;
	        this.ax3=this.limitMotor3.axis.x;
	        this.ay3=this.limitMotor3.axis.y;
	        this.az3=this.limitMotor3.axis.z;
	        this.lowerLimit1=this.limitMotor1.lowerLimit;
	        this.upperLimit1=this.limitMotor1.upperLimit;
	        this.motorSpeed1=this.limitMotor1.motorSpeed;
	        this.maxMotorForce1=this.limitMotor1.maxMotorForce;
	        this.enableMotor1=this.maxMotorForce1>0;
	        this.lowerLimit2=this.limitMotor2.lowerLimit;
	        this.upperLimit2=this.limitMotor2.upperLimit;
	        this.motorSpeed2=this.limitMotor2.motorSpeed;
	        this.maxMotorForce2=this.limitMotor2.maxMotorForce;
	        this.enableMotor2=this.maxMotorForce2>0;
	        this.lowerLimit3=this.limitMotor3.lowerLimit;
	        this.upperLimit3=this.limitMotor3.upperLimit;
	        this.motorSpeed3=this.limitMotor3.motorSpeed;
	        this.maxMotorForce3=this.limitMotor3.maxMotorForce;
	        this.enableMotor3=this.maxMotorForce3>0;
	        this.m1=this.b1.inverseMass;
	        this.m2=this.b2.inverseMass;

	        var ti1 = this.i1.elements;
	        var ti2 = this.i2.elements;
	        this.i1e00=ti1[0];
	        this.i1e01=ti1[1];
	        this.i1e02=ti1[2];
	        this.i1e10=ti1[3];
	        this.i1e11=ti1[4];
	        this.i1e12=ti1[5];
	        this.i1e20=ti1[6];
	        this.i1e21=ti1[7];
	        this.i1e22=ti1[8];

	        this.i2e00=ti2[0];
	        this.i2e01=ti2[1];
	        this.i2e02=ti2[2];
	        this.i2e10=ti2[3];
	        this.i2e11=ti2[4];
	        this.i2e12=ti2[5];
	        this.i2e20=ti2[6];
	        this.i2e21=ti2[7];
	        this.i2e22=ti2[8];

	        var dx=this.p2.x-this.p1.x;
	        var dy=this.p2.y-this.p1.y;
	        var dz=this.p2.z-this.p1.z;
	        var d1=dx*this.ax1+dy*this.ay1+dz*this.az1;
	        var d2=dx*this.ax2+dy*this.ay2+dz*this.az2;
	        var d3=dx*this.ax3+dy*this.ay3+dz*this.az3;
	        var frequency1=this.limitMotor1.frequency;
	        var frequency2=this.limitMotor2.frequency;
	        var frequency3=this.limitMotor3.frequency;
	        var enableSpring1=frequency1>0;
	        var enableSpring2=frequency2>0;
	        var enableSpring3=frequency3>0;
	        var enableLimit1=this.lowerLimit1<=this.upperLimit1;
	        var enableLimit2=this.lowerLimit2<=this.upperLimit2;
	        var enableLimit3=this.lowerLimit3<=this.upperLimit3;

	        // for stability
	        if(enableSpring1&&d1>20||d1<-20){
	            enableSpring1=false;
	        }
	        if(enableSpring2&&d2>20||d2<-20){
	            enableSpring2=false;
	        }
	        if(enableSpring3&&d3>20||d3<-20){
	            enableSpring3=false;
	        }

	        if(enableLimit1){
	            if(this.lowerLimit1==this.upperLimit1){
	                if(this.limitState1!=0){
	                    this.limitState1=0;
	                    this.limitImpulse1=0;
	                }
	                this.limitVelocity1=this.lowerLimit1-d1;
	                if(!enableSpring1)d1=this.lowerLimit1;
	            }else if(d1<this.lowerLimit1){
	                if(this.limitState1!=-1){
	                    this.limitState1=-1;
	                    this.limitImpulse1=0;
	                }
	                this.limitVelocity1=this.lowerLimit1-d1;
	                if(!enableSpring1)d1=this.lowerLimit1;
	            }else if(d1>this.upperLimit1){
	                if(this.limitState1!=1){
	                    this.limitState1=1;
	                    this.limitImpulse1=0;
	                }
	                this.limitVelocity1=this.upperLimit1-d1;
	                if(!enableSpring1)d1=this.upperLimit1;
	            }else{
	                this.limitState1=2;
	                this.limitImpulse1=0;
	                this.limitVelocity1=0;
	            }
	            if(!enableSpring1){
	                if(this.limitVelocity1>0.005)this.limitVelocity1-=0.005;
	                else if(this.limitVelocity1<-0.005)this.limitVelocity1+=0.005;
	                else this.limitVelocity1=0;
	            }
	        }else{
	            this.limitState1=2;
	            this.limitImpulse1=0;
	        }

	        if(enableLimit2){
	            if(this.lowerLimit2==this.upperLimit2){
	                if(this.limitState2!=0){
	                    this.limitState2=0;
	                    this.limitImpulse2=0;
	                }
	                this.limitVelocity2=this.lowerLimit2-d2;
	                if(!enableSpring2)d2=this.lowerLimit2;
	            }else if(d2<this.lowerLimit2){
	                if(this.limitState2!=-1){
	                    this.limitState2=-1;
	                    this.limitImpulse2=0;
	                }
	                this.limitVelocity2=this.lowerLimit2-d2;
	                if(!enableSpring2)d2=this.lowerLimit2;
	            }else if(d2>this.upperLimit2){
	                if(this.limitState2!=1){
	                    this.limitState2=1;
	                    this.limitImpulse2=0;
	                }
	                this.limitVelocity2=this.upperLimit2-d2;
	                if(!enableSpring2)d2=this.upperLimit2;
	            }else{
	                this.limitState2=2;
	                this.limitImpulse2=0;
	                this.limitVelocity2=0;
	            }
	            if(!enableSpring2){
	                if(this.limitVelocity2>0.005)this.limitVelocity2-=0.005;
	                else if(this.limitVelocity2<-0.005)this.limitVelocity2+=0.005;
	                else this.limitVelocity2=0;
	            }
	        }else{
	            this.limitState2=2;
	            this.limitImpulse2=0;
	        }

	        if(enableLimit3){
	            if(this.lowerLimit3==this.upperLimit3){
	                if(this.limitState3!=0){
	                    this.limitState3=0;
	                    this.limitImpulse3=0;
	                }
	                this.limitVelocity3=this.lowerLimit3-d3;
	                if(!enableSpring3)d3=this.lowerLimit3;
	                }else if(d3<this.lowerLimit3){
	                if(this.limitState3!=-1){
	                    this.limitState3=-1;
	                    this.limitImpulse3=0;
	                }
	                this.limitVelocity3=this.lowerLimit3-d3;
	                if(!enableSpring3)d3=this.lowerLimit3;
	            }else if(d3>this.upperLimit3){
	                if(this.limitState3!=1){
	                    this.limitState3=1;
	                    this.limitImpulse3=0;
	                }
	                this.limitVelocity3=this.upperLimit3-d3;
	                if(!enableSpring3)d3=this.upperLimit3;
	            }else{
	                this.limitState3=2;
	                this.limitImpulse3=0;
	                this.limitVelocity3=0;
	            }
	            if(!enableSpring3){
	                if(this.limitVelocity3>0.005)this.limitVelocity3-=0.005;
	                else if(this.limitVelocity3<-0.005)this.limitVelocity3+=0.005;
	                else this.limitVelocity3=0;
	            }
	        }else{
	            this.limitState3=2;
	            this.limitImpulse3=0;
	        }

	        if(this.enableMotor1&&(this.limitState1!=0||enableSpring1)){
	            this.maxMotorImpulse1=this.maxMotorForce1*timeStep;
	        }else{
	            this.motorImpulse1=0;
	            this.maxMotorImpulse1=0;
	        }

	        if(this.enableMotor2&&(this.limitState2!=0||enableSpring2)){
	            this.maxMotorImpulse2=this.maxMotorForce2*timeStep;
	        }else{
	            this.motorImpulse2=0;
	            this.maxMotorImpulse2=0;
	        }

	        if(this.enableMotor3&&(this.limitState3!=0||enableSpring3)){
	            this.maxMotorImpulse3=this.maxMotorForce3*timeStep;
	        }else{
	            this.motorImpulse3=0;
	            this.maxMotorImpulse3=0;
	        }
	        
	        var rdx=d1*this.ax1+d2*this.ax2+d3*this.ax2;
	        var rdy=d1*this.ay1+d2*this.ay2+d3*this.ay2;
	        var rdz=d1*this.az1+d2*this.az2+d3*this.az2;
	        var w1=this.m2/(this.m1+this.m2);
	        if(this.weight>=0)w1=this.weight; // use given weight
	        var w2=1-w1;
	        this.r1x=this.r1.x+rdx*w1;
	        this.r1y=this.r1.y+rdy*w1;
	        this.r1z=this.r1.z+rdz*w1;
	        this.r2x=this.r2.x-rdx*w2;
	        this.r2y=this.r2.y-rdy*w2;
	        this.r2z=this.r2.z-rdz*w2;

	        // build jacobians
	        this.t1x1=this.r1y*this.az1-this.r1z*this.ay1;
	        this.t1y1=this.r1z*this.ax1-this.r1x*this.az1;
	        this.t1z1=this.r1x*this.ay1-this.r1y*this.ax1;
	        this.t2x1=this.r2y*this.az1-this.r2z*this.ay1;
	        this.t2y1=this.r2z*this.ax1-this.r2x*this.az1;
	        this.t2z1=this.r2x*this.ay1-this.r2y*this.ax1;
	        this.l1x1=this.ax1*this.m1;
	        this.l1y1=this.ay1*this.m1;
	        this.l1z1=this.az1*this.m1;
	        this.l2x1=this.ax1*this.m2;
	        this.l2y1=this.ay1*this.m2;
	        this.l2z1=this.az1*this.m2;
	        this.a1x1=this.t1x1*this.i1e00+this.t1y1*this.i1e01+this.t1z1*this.i1e02;
	        this.a1y1=this.t1x1*this.i1e10+this.t1y1*this.i1e11+this.t1z1*this.i1e12;
	        this.a1z1=this.t1x1*this.i1e20+this.t1y1*this.i1e21+this.t1z1*this.i1e22;
	        this.a2x1=this.t2x1*this.i2e00+this.t2y1*this.i2e01+this.t2z1*this.i2e02;
	        this.a2y1=this.t2x1*this.i2e10+this.t2y1*this.i2e11+this.t2z1*this.i2e12;
	        this.a2z1=this.t2x1*this.i2e20+this.t2y1*this.i2e21+this.t2z1*this.i2e22;

	        this.t1x2=this.r1y*this.az2-this.r1z*this.ay2;
	        this.t1y2=this.r1z*this.ax2-this.r1x*this.az2;
	        this.t1z2=this.r1x*this.ay2-this.r1y*this.ax2;
	        this.t2x2=this.r2y*this.az2-this.r2z*this.ay2;
	        this.t2y2=this.r2z*this.ax2-this.r2x*this.az2;
	        this.t2z2=this.r2x*this.ay2-this.r2y*this.ax2;
	        this.l1x2=this.ax2*this.m1;
	        this.l1y2=this.ay2*this.m1;
	        this.l1z2=this.az2*this.m1;
	        this.l2x2=this.ax2*this.m2;
	        this.l2y2=this.ay2*this.m2;
	        this.l2z2=this.az2*this.m2;
	        this.a1x2=this.t1x2*this.i1e00+this.t1y2*this.i1e01+this.t1z2*this.i1e02;
	        this.a1y2=this.t1x2*this.i1e10+this.t1y2*this.i1e11+this.t1z2*this.i1e12;
	        this.a1z2=this.t1x2*this.i1e20+this.t1y2*this.i1e21+this.t1z2*this.i1e22;
	        this.a2x2=this.t2x2*this.i2e00+this.t2y2*this.i2e01+this.t2z2*this.i2e02;
	        this.a2y2=this.t2x2*this.i2e10+this.t2y2*this.i2e11+this.t2z2*this.i2e12;
	        this.a2z2=this.t2x2*this.i2e20+this.t2y2*this.i2e21+this.t2z2*this.i2e22;

	        this.t1x3=this.r1y*this.az3-this.r1z*this.ay3;
	        this.t1y3=this.r1z*this.ax3-this.r1x*this.az3;
	        this.t1z3=this.r1x*this.ay3-this.r1y*this.ax3;
	        this.t2x3=this.r2y*this.az3-this.r2z*this.ay3;
	        this.t2y3=this.r2z*this.ax3-this.r2x*this.az3;
	        this.t2z3=this.r2x*this.ay3-this.r2y*this.ax3;
	        this.l1x3=this.ax3*this.m1;
	        this.l1y3=this.ay3*this.m1;
	        this.l1z3=this.az3*this.m1;
	        this.l2x3=this.ax3*this.m2;
	        this.l2y3=this.ay3*this.m2;
	        this.l2z3=this.az3*this.m2;
	        this.a1x3=this.t1x3*this.i1e00+this.t1y3*this.i1e01+this.t1z3*this.i1e02;
	        this.a1y3=this.t1x3*this.i1e10+this.t1y3*this.i1e11+this.t1z3*this.i1e12;
	        this.a1z3=this.t1x3*this.i1e20+this.t1y3*this.i1e21+this.t1z3*this.i1e22;
	        this.a2x3=this.t2x3*this.i2e00+this.t2y3*this.i2e01+this.t2z3*this.i2e02;
	        this.a2y3=this.t2x3*this.i2e10+this.t2y3*this.i2e11+this.t2z3*this.i2e12;
	        this.a2z3=this.t2x3*this.i2e20+this.t2y3*this.i2e21+this.t2z3*this.i2e22;

	        // build an impulse matrix
	        var m12=this.m1+this.m2;
	        this.k00=(this.ax1*this.ax1+this.ay1*this.ay1+this.az1*this.az1)*m12;
	        this.k01=(this.ax1*this.ax2+this.ay1*this.ay2+this.az1*this.az2)*m12;
	        this.k02=(this.ax1*this.ax3+this.ay1*this.ay3+this.az1*this.az3)*m12;
	        this.k10=(this.ax2*this.ax1+this.ay2*this.ay1+this.az2*this.az1)*m12;
	        this.k11=(this.ax2*this.ax2+this.ay2*this.ay2+this.az2*this.az2)*m12;
	        this.k12=(this.ax2*this.ax3+this.ay2*this.ay3+this.az2*this.az3)*m12;
	        this.k20=(this.ax3*this.ax1+this.ay3*this.ay1+this.az3*this.az1)*m12;
	        this.k21=(this.ax3*this.ax2+this.ay3*this.ay2+this.az3*this.az2)*m12;
	        this.k22=(this.ax3*this.ax3+this.ay3*this.ay3+this.az3*this.az3)*m12;

	        this.k00+=this.t1x1*this.a1x1+this.t1y1*this.a1y1+this.t1z1*this.a1z1;
	        this.k01+=this.t1x1*this.a1x2+this.t1y1*this.a1y2+this.t1z1*this.a1z2;
	        this.k02+=this.t1x1*this.a1x3+this.t1y1*this.a1y3+this.t1z1*this.a1z3;
	        this.k10+=this.t1x2*this.a1x1+this.t1y2*this.a1y1+this.t1z2*this.a1z1;
	        this.k11+=this.t1x2*this.a1x2+this.t1y2*this.a1y2+this.t1z2*this.a1z2;
	        this.k12+=this.t1x2*this.a1x3+this.t1y2*this.a1y3+this.t1z2*this.a1z3;
	        this.k20+=this.t1x3*this.a1x1+this.t1y3*this.a1y1+this.t1z3*this.a1z1;
	        this.k21+=this.t1x3*this.a1x2+this.t1y3*this.a1y2+this.t1z3*this.a1z2;
	        this.k22+=this.t1x3*this.a1x3+this.t1y3*this.a1y3+this.t1z3*this.a1z3;

	        this.k00+=this.t2x1*this.a2x1+this.t2y1*this.a2y1+this.t2z1*this.a2z1;
	        this.k01+=this.t2x1*this.a2x2+this.t2y1*this.a2y2+this.t2z1*this.a2z2;
	        this.k02+=this.t2x1*this.a2x3+this.t2y1*this.a2y3+this.t2z1*this.a2z3;
	        this.k10+=this.t2x2*this.a2x1+this.t2y2*this.a2y1+this.t2z2*this.a2z1;
	        this.k11+=this.t2x2*this.a2x2+this.t2y2*this.a2y2+this.t2z2*this.a2z2;
	        this.k12+=this.t2x2*this.a2x3+this.t2y2*this.a2y3+this.t2z2*this.a2z3;
	        this.k20+=this.t2x3*this.a2x1+this.t2y3*this.a2y1+this.t2z3*this.a2z1;
	        this.k21+=this.t2x3*this.a2x2+this.t2y3*this.a2y2+this.t2z3*this.a2z2;
	        this.k22+=this.t2x3*this.a2x3+this.t2y3*this.a2y3+this.t2z3*this.a2z3;

	        this.kv00=this.k00;
	        this.kv11=this.k11;
	        this.kv22=this.k22;

	        this.dv00=1/this.kv00;
	        this.dv11=1/this.kv11;
	        this.dv22=1/this.kv22;

	        if(enableSpring1&&this.limitState1!=2){
	            var omega=6.2831853*frequency1;
	            var k=omega*omega*timeStep;
	            var dmp=invTimeStep/(k+2*this.limitMotor1.dampingRatio*omega);
	            this.cfm1=this.kv00*dmp;
	            this.limitVelocity1*=k*dmp;
	        }else{
	            this.cfm1=0;
	            this.limitVelocity1*=invTimeStep*0.05;
	        }
	        if(enableSpring2&&this.limitState2!=2){
	            omega=6.2831853*frequency2;
	            k=omega*omega*timeStep;
	            dmp=invTimeStep/(k+2*this.limitMotor2.dampingRatio*omega);
	            this.cfm2=this.kv11*dmp;
	            this.limitVelocity2*=k*dmp;
	        }else{
	            this.cfm2=0;
	            this.limitVelocity2*=invTimeStep*0.05;
	        }
	        if(enableSpring3&&this.limitState3!=2){
	            omega=6.2831853*frequency3;
	            k=omega*omega*timeStep;
	            dmp=invTimeStep/(k+2*this.limitMotor3.dampingRatio*omega);
	            this.cfm3=this.kv22*dmp;
	            this.limitVelocity3*=k*dmp;
	        }else{
	            this.cfm3=0;
	            this.limitVelocity3*=invTimeStep*0.05;
	        }
	        this.k00+=this.cfm1;
	        this.k11+=this.cfm2;
	        this.k22+=this.cfm3;

	        var inv=1/(
	        this.k00*(this.k11*this.k22-this.k21*this.k12)+
	        this.k10*(this.k21*this.k02-this.k01*this.k22)+
	        this.k20*(this.k01*this.k12-this.k11*this.k02)
	        );
	        this.d00=(this.k11*this.k22-this.k12*this.k21)*inv;
	        this.d01=(this.k02*this.k21-this.k01*this.k22)*inv;
	        this.d02=(this.k01*this.k12-this.k02*this.k11)*inv;
	        this.d10=(this.k12*this.k20-this.k10*this.k22)*inv;
	        this.d11=(this.k00*this.k22-this.k02*this.k20)*inv;
	        this.d12=(this.k02*this.k10-this.k00*this.k12)*inv;
	        this.d20=(this.k10*this.k21-this.k11*this.k20)*inv;
	        this.d21=(this.k01*this.k20-this.k00*this.k21)*inv;
	        this.d22=(this.k00*this.k11-this.k01*this.k10)*inv;

	        // warm starting
	        var totalImpulse1=this.limitImpulse1+this.motorImpulse1;
	        var totalImpulse2=this.limitImpulse2+this.motorImpulse2;
	        var totalImpulse3=this.limitImpulse3+this.motorImpulse3;
	        this.l1.x+=totalImpulse1*this.l1x1+totalImpulse2*this.l1x2+totalImpulse3*this.l1x3;
	        this.l1.y+=totalImpulse1*this.l1y1+totalImpulse2*this.l1y2+totalImpulse3*this.l1y3;
	        this.l1.z+=totalImpulse1*this.l1z1+totalImpulse2*this.l1z2+totalImpulse3*this.l1z3;
	        this.a1.x+=totalImpulse1*this.a1x1+totalImpulse2*this.a1x2+totalImpulse3*this.a1x3;
	        this.a1.y+=totalImpulse1*this.a1y1+totalImpulse2*this.a1y2+totalImpulse3*this.a1y3;
	        this.a1.z+=totalImpulse1*this.a1z1+totalImpulse2*this.a1z2+totalImpulse3*this.a1z3;
	        this.l2.x-=totalImpulse1*this.l2x1+totalImpulse2*this.l2x2+totalImpulse3*this.l2x3;
	        this.l2.y-=totalImpulse1*this.l2y1+totalImpulse2*this.l2y2+totalImpulse3*this.l2y3;
	        this.l2.z-=totalImpulse1*this.l2z1+totalImpulse2*this.l2z2+totalImpulse3*this.l2z3;
	        this.a2.x-=totalImpulse1*this.a2x1+totalImpulse2*this.a2x2+totalImpulse3*this.a2x3;
	        this.a2.y-=totalImpulse1*this.a2y1+totalImpulse2*this.a2y2+totalImpulse3*this.a2y3;
	        this.a2.z-=totalImpulse1*this.a2z1+totalImpulse2*this.a2z2+totalImpulse3*this.a2z3;
	    },

	    solve:function(){
	        var rvx=this.l2.x-this.l1.x+this.a2.y*this.r2z-this.a2.z*this.r2y-this.a1.y*this.r1z+this.a1.z*this.r1y;
	        var rvy=this.l2.y-this.l1.y+this.a2.z*this.r2x-this.a2.x*this.r2z-this.a1.z*this.r1x+this.a1.x*this.r1z;
	        var rvz=this.l2.z-this.l1.z+this.a2.x*this.r2y-this.a2.y*this.r2x-this.a1.x*this.r1y+this.a1.y*this.r1x;
	        var rvn1=rvx*this.ax1+rvy*this.ay1+rvz*this.az1;
	        var rvn2=rvx*this.ax2+rvy*this.ay2+rvz*this.az2;
	        var rvn3=rvx*this.ax3+rvy*this.ay3+rvz*this.az3;
	        var oldMotorImpulse1=this.motorImpulse1;
	        var oldMotorImpulse2=this.motorImpulse2;
	        var oldMotorImpulse3=this.motorImpulse3;
	        var dMotorImpulse1=0;
	        var dMotorImpulse2=0;
	        var dMotorImpulse3=0;
	        if(this.enableMotor1){
	            dMotorImpulse1=(rvn1-this.motorSpeed1)*this.dv00;
	            this.motorImpulse1+=dMotorImpulse1;
	            if(this.motorImpulse1>this.maxMotorImpulse1){ // clamp motor impulse
	                this.motorImpulse1=this.maxMotorImpulse1;
	            }else if(this.motorImpulse1<-this.maxMotorImpulse1){
	                this.motorImpulse1=-this.maxMotorImpulse1;
	            }
	            dMotorImpulse1=this.motorImpulse1-oldMotorImpulse1;
	        }
	        if(this.enableMotor2){
	            dMotorImpulse2=(rvn2-this.motorSpeed2)*this.dv11;
	            this.motorImpulse2+=dMotorImpulse2;
	            if(this.motorImpulse2>this.maxMotorImpulse2){ // clamp motor impulse
	                this.motorImpulse2=this.maxMotorImpulse2;
	            }else if(this.motorImpulse2<-this.maxMotorImpulse2){
	                this.motorImpulse2=-this.maxMotorImpulse2;
	            }
	            dMotorImpulse2=this.motorImpulse2-oldMotorImpulse2;
	        }
	        if(this.enableMotor3){
	            dMotorImpulse3=(rvn3-this.motorSpeed3)*this.dv22;
	            this.motorImpulse3+=dMotorImpulse3;
	            if(this.motorImpulse3>this.maxMotorImpulse3){ // clamp motor impulse
	                this.motorImpulse3=this.maxMotorImpulse3;
	            }else if(this.motorImpulse3<-this.maxMotorImpulse3){
	                this.motorImpulse3=-this.maxMotorImpulse3;
	            }
	            dMotorImpulse3=this.motorImpulse3-oldMotorImpulse3;
	        }

	        // apply motor impulse to relative velocity
	        rvn1+=dMotorImpulse1*this.kv00+dMotorImpulse2*this.k01+dMotorImpulse3*this.k02;
	        rvn2+=dMotorImpulse1*this.k10+dMotorImpulse2*this.kv11+dMotorImpulse3*this.k12;
	        rvn3+=dMotorImpulse1*this.k20+dMotorImpulse2*this.k21+dMotorImpulse3*this.kv22;

	        // subtract target velocity and applied impulse
	        rvn1-=this.limitVelocity1+this.limitImpulse1*this.cfm1;
	        rvn2-=this.limitVelocity2+this.limitImpulse2*this.cfm2;
	        rvn3-=this.limitVelocity3+this.limitImpulse3*this.cfm3;

	        var oldLimitImpulse1=this.limitImpulse1;
	        var oldLimitImpulse2=this.limitImpulse2;
	        var oldLimitImpulse3=this.limitImpulse3;

	        var dLimitImpulse1=rvn1*this.d00+rvn2*this.d01+rvn3*this.d02;
	        var dLimitImpulse2=rvn1*this.d10+rvn2*this.d11+rvn3*this.d12;
	        var dLimitImpulse3=rvn1*this.d20+rvn2*this.d21+rvn3*this.d22;

	        this.limitImpulse1+=dLimitImpulse1;
	        this.limitImpulse2+=dLimitImpulse2;
	        this.limitImpulse3+=dLimitImpulse3;

	        // clamp
	        var clampState=0;
	        if(this.limitState1==2||this.limitImpulse1*this.limitState1<0){
	            dLimitImpulse1=-oldLimitImpulse1;
	            rvn2+=dLimitImpulse1*this.k10;
	            rvn3+=dLimitImpulse1*this.k20;
	            clampState|=1;
	        }
	        if(this.limitState2==2||this.limitImpulse2*this.limitState2<0){
	            dLimitImpulse2=-oldLimitImpulse2;
	            rvn1+=dLimitImpulse2*this.k01;
	            rvn3+=dLimitImpulse2*this.k21;
	            clampState|=2;
	        }
	        if(this.limitState3==2||this.limitImpulse3*this.limitState3<0){
	            dLimitImpulse3=-oldLimitImpulse3;
	            rvn1+=dLimitImpulse3*this.k02;
	            rvn2+=dLimitImpulse3*this.k12;
	            clampState|=4;
	        }

	        // update un-clamped impulse
	        // TODO: isolate division
	        var det;
	        switch(clampState){
	            case 1:// update 2 3
	            det=1/(this.k11*this.k22-this.k12*this.k21);
	            dLimitImpulse2=(this.k22*rvn2+-this.k12*rvn3)*det;
	            dLimitImpulse3=(-this.k21*rvn2+this.k11*rvn3)*det;
	            break;
	            case 2:// update 1 3
	            det=1/(this.k00*this.k22-this.k02*this.k20);
	            dLimitImpulse1=(this.k22*rvn1+-this.k02*rvn3)*det;
	            dLimitImpulse3=(-this.k20*rvn1+this.k00*rvn3)*det;
	            break;
	            case 3:// update 3
	            dLimitImpulse3=rvn3/this.k22;
	            break;
	            case 4:// update 1 2
	            det=1/(this.k00*this.k11-this.k01*this.k10);
	            dLimitImpulse1=(this.k11*rvn1+-this.k01*rvn2)*det;
	            dLimitImpulse2=(-this.k10*rvn1+this.k00*rvn2)*det;
	            break;
	            case 5:// update 2
	            dLimitImpulse2=rvn2/this.k11;
	            break;
	            case 6:// update 1
	            dLimitImpulse1=rvn1/this.k00;
	            break;
	        }

	        this.limitImpulse1=oldLimitImpulse1+dLimitImpulse1;
	        this.limitImpulse2=oldLimitImpulse2+dLimitImpulse2;
	        this.limitImpulse3=oldLimitImpulse3+dLimitImpulse3;

	        var dImpulse1=dMotorImpulse1+dLimitImpulse1;
	        var dImpulse2=dMotorImpulse2+dLimitImpulse2;
	        var dImpulse3=dMotorImpulse3+dLimitImpulse3;

	        // apply impulse
	        this.l1.x+=dImpulse1*this.l1x1+dImpulse2*this.l1x2+dImpulse3*this.l1x3;
	        this.l1.y+=dImpulse1*this.l1y1+dImpulse2*this.l1y2+dImpulse3*this.l1y3;
	        this.l1.z+=dImpulse1*this.l1z1+dImpulse2*this.l1z2+dImpulse3*this.l1z3;
	        this.a1.x+=dImpulse1*this.a1x1+dImpulse2*this.a1x2+dImpulse3*this.a1x3;
	        this.a1.y+=dImpulse1*this.a1y1+dImpulse2*this.a1y2+dImpulse3*this.a1y3;
	        this.a1.z+=dImpulse1*this.a1z1+dImpulse2*this.a1z2+dImpulse3*this.a1z3;
	        this.l2.x-=dImpulse1*this.l2x1+dImpulse2*this.l2x2+dImpulse3*this.l2x3;
	        this.l2.y-=dImpulse1*this.l2y1+dImpulse2*this.l2y2+dImpulse3*this.l2y3;
	        this.l2.z-=dImpulse1*this.l2z1+dImpulse2*this.l2z2+dImpulse3*this.l2z3;
	        this.a2.x-=dImpulse1*this.a2x1+dImpulse2*this.a2x2+dImpulse3*this.a2x3;
	        this.a2.y-=dImpulse1*this.a2y1+dImpulse2*this.a2y2+dImpulse3*this.a2y3;
	        this.a2.z-=dImpulse1*this.a2z1+dImpulse2*this.a2z2+dImpulse3*this.a2z3;
	    }
	    
	} );

	/**
	 * A prismatic joint allows only for relative translation of rigid bodies along the axis.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function PrismaticJoint( config, lowerTranslation, upperTranslation ){

	    Joint.call( this, config );

	    this.type = JOINT_PRISMATIC;

	    // The axis in the first body's coordinate system.
	    this.localAxis1 = config.localAxis1.clone().normalize();
	    // The axis in the second body's coordinate system.
	    this.localAxis2 = config.localAxis2.clone().normalize();

	    this.ax1 = new Vec3();
	    this.ax2 = new Vec3();
	    
	    this.nor = new Vec3();
	    this.tan = new Vec3();
	    this.bin = new Vec3();

	    this.ac = new AngularConstraint( this, new Quat().setFromUnitVectors( this.localAxis1, this.localAxis2 ) );

	    // The translational limit and motor information of the joint.
	    this.limitMotor = new LimitMotor( this.nor, true );
	    this.limitMotor.lowerLimit = lowerTranslation;
	    this.limitMotor.upperLimit = upperTranslation;
	    this.t3 = new Translational3Constraint( this, this.limitMotor, new LimitMotor( this.tan, true ), new LimitMotor( this.bin, true ) );

	}

	PrismaticJoint.prototype = Object.assign( Object.create( Joint.prototype ), {

	    constructor: PrismaticJoint,

	    preSolve: function ( timeStep, invTimeStep ) {

	        this.updateAnchorPoints();

	        this.ax1.copy( this.localAxis1 ).applyMatrix3( this.body1.rotation, true );
	        this.ax2.copy( this.localAxis2 ).applyMatrix3( this.body2.rotation, true );

	        // normal tangent binormal

	        this.nor.set(
	            this.ax1.x*this.body2.inverseMass + this.ax2.x*this.body1.inverseMass,
	            this.ax1.y*this.body2.inverseMass + this.ax2.y*this.body1.inverseMass,
	            this.ax1.z*this.body2.inverseMass + this.ax2.z*this.body1.inverseMass
	        ).normalize();
	        this.tan.tangent( this.nor ).normalize();
	        this.bin.crossVectors( this.nor, this.tan );

	        // preSolve

	        this.ac.preSolve( timeStep, invTimeStep );
	        this.t3.preSolve( timeStep, invTimeStep );

	    },

	    solve: function () {

	        this.ac.solve();
	        this.t3.solve();
	        
	    },

	    postSolve: function () {

	    }

	});

	/**
	 * A slider joint allows for relative translation and relative rotation between two rigid bodies along the axis.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function SliderJoint( config, lowerTranslation, upperTranslation ){

	    Joint.call( this, config );

	    this.type = JOINT_SLIDER;

	    // The axis in the first body's coordinate system.
	    this.localAxis1 = config.localAxis1.clone().normalize();
	    // The axis in the second body's coordinate system.
	    this.localAxis2 = config.localAxis2.clone().normalize();

	    // make angle axis
	    var arc = new Mat33().setQuat( new Quat().setFromUnitVectors( this.localAxis1, this.localAxis2 ) );
	    this.localAngle1 = new Vec3().tangent( this.localAxis1 ).normalize();
	    this.localAngle2 = this.localAngle1.clone().applyMatrix3( arc, true );

	    this.ax1 = new Vec3();
	    this.ax2 = new Vec3();
	    this.an1 = new Vec3();
	    this.an2 = new Vec3();

	    this.tmp = new Vec3();
	    
	    this.nor = new Vec3();
	    this.tan = new Vec3();
	    this.bin = new Vec3();

	    // The limit and motor for the rotation
	    this.rotationalLimitMotor = new LimitMotor( this.nor, false );
	    this.r3 = new Rotational3Constraint( this, this.rotationalLimitMotor, new LimitMotor( this.tan, true ), new LimitMotor( this.bin, true ) );

	    // The limit and motor for the translation.
	    this.translationalLimitMotor = new LimitMotor( this.nor, true );
	    this.translationalLimitMotor.lowerLimit = lowerTranslation;
	    this.translationalLimitMotor.upperLimit = upperTranslation;
	    this.t3 = new Translational3Constraint( this, this.translationalLimitMotor, new LimitMotor( this.tan, true ), new LimitMotor( this.bin, true ) );

	}

	SliderJoint.prototype = Object.assign( Object.create( Joint.prototype ), {

	    constructor: SliderJoint,

	    preSolve: function ( timeStep, invTimeStep ) {

	        this.updateAnchorPoints();

	        this.ax1.copy( this.localAxis1 ).applyMatrix3( this.body1.rotation, true );
	        this.an1.copy( this.localAngle1 ).applyMatrix3( this.body1.rotation, true );

	        this.ax2.copy( this.localAxis2 ).applyMatrix3( this.body2.rotation, true );
	        this.an2.copy( this.localAngle2 ).applyMatrix3( this.body2.rotation, true );

	        // normal tangent binormal

	        this.nor.set(
	            this.ax1.x*this.body2.inverseMass + this.ax2.x*this.body1.inverseMass,
	            this.ax1.y*this.body2.inverseMass + this.ax2.y*this.body1.inverseMass,
	            this.ax1.z*this.body2.inverseMass + this.ax2.z*this.body1.inverseMass
	        ).normalize();
	        this.tan.tangent( this.nor ).normalize();
	        this.bin.crossVectors( this.nor, this.tan );

	        // calculate hinge angle

	        this.tmp.crossVectors( this.an1, this.an2 );

	        var limite = _Math.acosClamp( _Math.dotVectors( this.an1, this.an2 ) );

	        if( _Math.dotVectors( this.nor, this.tmp ) < 0 ) this.rotationalLimitMotor.angle = -limite;
	        else this.rotationalLimitMotor.angle = limite;

	        // angular error

	        this.tmp.crossVectors( this.ax1, this.ax2 );
	        this.r3.limitMotor2.angle = _Math.dotVectors( this.tan, this.tmp );
	        this.r3.limitMotor3.angle = _Math.dotVectors( this.bin, this.tmp );

	        // preSolve
	        
	        this.r3.preSolve( timeStep, invTimeStep );
	        this.t3.preSolve( timeStep, invTimeStep );

	    },

	    solve: function () {

	        this.r3.solve();
	        this.t3.solve();

	    },

	    postSolve: function () {

	    }

	});

	/**
	 * A wheel joint allows for relative rotation between two rigid bodies along two axes.
	 * The wheel joint also allows for relative translation for the suspension.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function WheelJoint ( config ){

	    Joint.call( this, config );

	    this.type = JOINT_WHEEL;

	    // The axis in the first body's coordinate system.
	    this.localAxis1 = config.localAxis1.clone().normalize();
	    // The axis in the second body's coordinate system.
	    this.localAxis2 = config.localAxis2.clone().normalize();

	    this.localAngle1 = new Vec3();
	    this.localAngle2 = new Vec3();

	    var dot = _Math.dotVectors( this.localAxis1, this.localAxis2 );

	    if( dot > -1 && dot < 1 ){

	        this.localAngle1.set(
	            this.localAxis2.x - dot*this.localAxis1.x,
	            this.localAxis2.y - dot*this.localAxis1.y,
	            this.localAxis2.z - dot*this.localAxis1.z
	        ).normalize();

	        this.localAngle2.set(
	            this.localAxis1.x - dot*this.localAxis2.x,
	            this.localAxis1.y - dot*this.localAxis2.y,
	            this.localAxis1.z - dot*this.localAxis2.z
	        ).normalize();

	    } else {

	        var arc = new Mat33().setQuat( new Quat().setFromUnitVectors( this.localAxis1, this.localAxis2 ) );
	        this.localAngle1.tangent( this.localAxis1 ).normalize();
	        this.localAngle2 = this.localAngle1.clone().applyMatrix3( arc, true );

	    }

	    this.ax1 = new Vec3();
	    this.ax2 = new Vec3();
	    this.an1 = new Vec3();
	    this.an2 = new Vec3();

	    this.tmp = new Vec3();

	    this.nor = new Vec3();
	    this.tan = new Vec3();
	    this.bin = new Vec3();

	    // The translational limit and motor information of the joint.
	    this.translationalLimitMotor = new LimitMotor( this.tan,true );
	    this.translationalLimitMotor.frequency = 8;
	    this.translationalLimitMotor.dampingRatio = 1;
	    // The first rotational limit and motor information of the joint.
	    this.rotationalLimitMotor1 = new LimitMotor( this.tan, false );
	    // The second rotational limit and motor information of the joint.
	    this.rotationalLimitMotor2 = new LimitMotor( this.bin, false );

	    this.t3 = new Translational3Constraint( this, new LimitMotor( this.nor, true ),this.translationalLimitMotor,new LimitMotor( this.bin, true ));
	    this.t3.weight = 1;
	    this.r3 = new Rotational3Constraint(this,new LimitMotor( this.nor, true ),this.rotationalLimitMotor1,this.rotationalLimitMotor2);

	}

	WheelJoint.prototype = Object.assign( Object.create( Joint.prototype ), {

	    constructor: WheelJoint,

	    preSolve: function ( timeStep, invTimeStep ) {

	        this.updateAnchorPoints();

	        this.ax1.copy( this.localAxis1 ).applyMatrix3( this.body1.rotation, true );
	        this.an1.copy( this.localAngle1 ).applyMatrix3( this.body1.rotation, true );

	        this.ax2.copy( this.localAxis2 ).applyMatrix3( this.body2.rotation, true );
	        this.an2.copy( this.localAngle2 ).applyMatrix3( this.body2.rotation, true );

	        this.r3.limitMotor1.angle = _Math.dotVectors( this.ax1, this.ax2 );

	        var limite = _Math.dotVectors( this.an1, this.ax2 );

	        if( _Math.dotVectors( this.ax1, this.tmp.crossVectors( this.an1, this.ax2 ) ) < 0 ) this.rotationalLimitMotor1.angle = -limite;
	        else this.rotationalLimitMotor1.angle = limite;

	        limite = _Math.dotVectors( this.an2, this.ax1 );

	        if( _Math.dotVectors( this.ax2, this.tmp.crossVectors( this.an2, this.ax1 ) ) < 0 ) this.rotationalLimitMotor2.angle = -limite;
	        else this.rotationalLimitMotor2.angle = limite;

	        this.nor.crossVectors( this.ax1, this.ax2 ).normalize();
	        this.tan.crossVectors( this.nor, this.ax2 ).normalize();
	        this.bin.crossVectors( this.nor, this.ax1 ).normalize();
	        
	        this.r3.preSolve(timeStep,invTimeStep);
	        this.t3.preSolve(timeStep,invTimeStep);

	    },

	    solve: function () {

	        this.r3.solve();
	        this.t3.solve();

	    },

	    postSolve: function () {

	    }

	});

	function JointConfig(){

	    this.scale = 1;
	    this.invScale = 1;

	    // The first rigid body of the joint.
	    this.body1 = null;
	    // The second rigid body of the joint.
	    this.body2 = null;
	    // The anchor point on the first rigid body in local coordinate system.
	    this.localAnchorPoint1 = new Vec3();
	    //  The anchor point on the second rigid body in local coordinate system.
	    this.localAnchorPoint2 = new Vec3();
	    // The axis in the first body's coordinate system.
	    // his property is available in some joints.
	    this.localAxis1 = new Vec3();
	    // The axis in the second body's coordinate system.
	    // This property is available in some joints.
	    this.localAxis2 = new Vec3();
	    //  Whether allow collision between connected rigid bodies or not.
	    this.allowCollision = false;

	}

	/**
	 * This class holds mass information of a shape.
	 * @author lo-th
	 * @author saharan
	 */

	function MassInfo (){

	    // Mass of the shape.
	    this.mass = 0;

	    // The moment inertia of the shape.
	    this.inertia = new Mat33();

	}

	/**
	* A link list of contacts.
	* @author saharan
	*/
	function ContactLink ( contact ){
	    
		// The previous contact link.
	    this.prev = null;
	    // The next contact link.
	    this.next = null;
	    // The shape of the contact.
	    this.shape = null;
	    // The other rigid body.
	    this.body = null;
	    // The contact of the link.
	    this.contact = contact;

	}

	function ImpulseDataBuffer (){

	    this.lp1X = NaN;
	    this.lp1Y = NaN;
	    this.lp1Z = NaN;
	    this.lp2X = NaN;
	    this.lp2Y = NaN;
	    this.lp2Z = NaN;
	    this.impulse = NaN;

	}

	/**
	* The class holds details of the contact point.
	* @author saharan
	*/

	function ManifoldPoint(){

	    // Whether this manifold point is persisting or not.
	    this.warmStarted = false;
	    //  The position of this manifold point.
	    this.position = new Vec3();
	    // The position in the first shape's coordinate.
	    this.localPoint1 = new Vec3();
	    //  The position in the second shape's coordinate.
	    this.localPoint2 = new Vec3();
	    // The normal vector of this manifold point.
	    this.normal = new Vec3();
	    // The tangent vector of this manifold point.
	    this.tangent = new Vec3();
	    // The binormal vector of this manifold point.
	    this.binormal = new Vec3();
	    // The impulse in normal direction.
	    this.normalImpulse = 0;
	    // The impulse in tangent direction.
	    this.tangentImpulse = 0;
	    // The impulse in binormal direction.
	    this.binormalImpulse = 0;
	    // The denominator in normal direction.
	    this.normalDenominator = 0;
	    // The denominator in tangent direction.
	    this.tangentDenominator = 0;
	    // The denominator in binormal direction.
	    this.binormalDenominator = 0;
	    // The depth of penetration.
	    this.penetration = 0;

	}

	/**
	* A contact manifold between two shapes.
	* @author saharan
	* @author lo-th
	*/

	function ContactManifold () {

	    // The first rigid body.
	    this.body1 = null;
	    // The second rigid body.
	    this.body2 = null;
	    // The number of manifold points.
	    this.numPoints = 0;
	    // The manifold points.
	    this.points = [
	        new ManifoldPoint(),
	        new ManifoldPoint(),
	        new ManifoldPoint(),
	        new ManifoldPoint()
	    ];

	}

	ContactManifold.prototype = {

	    constructor: ContactManifold,

	    //Reset the manifold.
	    reset:function( shape1, shape2 ){

	        this.body1 = shape1.parent;
	        this.body2 = shape2.parent;
	        this.numPoints = 0;

	    },

	    //  Add a point into this manifold.
	    addPointVec: function ( pos, norm, penetration, flip ) {
	        
	        var p = this.points[ this.numPoints++ ];

	        p.position.copy( pos );
	        p.localPoint1.sub( pos, this.body1.position ).applyMatrix3( this.body1.rotation );
	        p.localPoint2.sub( pos, this.body2.position ).applyMatrix3( this.body2.rotation );

	        p.normal.copy( norm );
	        if( flip ) p.normal.negate();

	        p.normalImpulse = 0;
	        p.penetration = penetration;
	        p.warmStarted = false;
	        
	    },

	    //  Add a point into this manifold.
	    addPoint: function ( x, y, z, nx, ny, nz, penetration, flip ) {
	        
	        var p = this.points[ this.numPoints++ ];

	        p.position.set( x, y, z );
	        p.localPoint1.sub( p.position, this.body1.position ).applyMatrix3( this.body1.rotation );
	        p.localPoint2.sub( p.position, this.body2.position ).applyMatrix3( this.body2.rotation );

	        p.normalImpulse = 0;

	        p.normal.set( nx, ny, nz );
	        if( flip ) p.normal.negate();

	        p.penetration = penetration;
	        p.warmStarted = false;
	        
	    }
	};

	function ContactPointDataBuffer (){

	    this.nor = new Vec3();
	    this.tan = new Vec3();
	    this.bin = new Vec3();

	    this.norU1 = new Vec3();
	    this.tanU1 = new Vec3();
	    this.binU1 = new Vec3();

	    this.norU2 = new Vec3();
	    this.tanU2 = new Vec3();
	    this.binU2 = new Vec3();

	    this.norT1 = new Vec3();
	    this.tanT1 = new Vec3();
	    this.binT1 = new Vec3();

	    this.norT2 = new Vec3();
	    this.tanT2 = new Vec3();
	    this.binT2 = new Vec3();

	    this.norTU1 = new Vec3();
	    this.tanTU1 = new Vec3();
	    this.binTU1 = new Vec3();

	    this.norTU2 = new Vec3();
	    this.tanTU2 = new Vec3();
	    this.binTU2 = new Vec3();

	    this.norImp = 0;
	    this.tanImp = 0;
	    this.binImp = 0;

	    this.norDen = 0;
	    this.tanDen = 0;
	    this.binDen = 0;

	    this.norTar = 0;

	    this.next = null;
	    this.last = false;

	}

	/**
	* ...
	* @author saharan
	*/
	function ContactConstraint ( manifold ){
	    
	    Constraint.call( this );
	    // The contact manifold of the constraint.
	    this.manifold = manifold;
	    // The coefficient of restitution of the constraint.
	    this.restitution=NaN;
	    // The coefficient of friction of the constraint.
	    this.friction=NaN;
	    this.p1=null;
	    this.p2=null;
	    this.lv1=null;
	    this.lv2=null;
	    this.av1=null;
	    this.av2=null;
	    this.i1=null;
	    this.i2=null;

	    //this.ii1 = null;
	    //this.ii2 = null;

	    this.tmp = new Vec3();
	    this.tmpC1 = new Vec3();
	    this.tmpC2 = new Vec3();

	    this.tmpP1 = new Vec3();
	    this.tmpP2 = new Vec3();

	    this.tmplv1 = new Vec3();
	    this.tmplv2 = new Vec3();
	    this.tmpav1 = new Vec3();
	    this.tmpav2 = new Vec3();

	    this.m1=NaN;
	    this.m2=NaN;
	    this.num=0;
	    
	    this.ps = manifold.points;
	    this.cs = new ContactPointDataBuffer();
	    this.cs.next = new ContactPointDataBuffer();
	    this.cs.next.next = new ContactPointDataBuffer();
	    this.cs.next.next.next = new ContactPointDataBuffer();
	}

	ContactConstraint.prototype = Object.assign( Object.create( Constraint.prototype ), {

	    constructor: ContactConstraint,

	    // Attach the constraint to the bodies.
	    attach: function(){

	        this.p1=this.body1.position;
	        this.p2=this.body2.position;
	        this.lv1=this.body1.linearVelocity;
	        this.av1=this.body1.angularVelocity;
	        this.lv2=this.body2.linearVelocity;
	        this.av2=this.body2.angularVelocity;
	        this.i1=this.body1.inverseInertia;
	        this.i2=this.body2.inverseInertia;

	    },

	    // Detach the constraint from the bodies.
	    detach: function(){

	        this.p1=null;
	        this.p2=null;
	        this.lv1=null;
	        this.lv2=null;
	        this.av1=null;
	        this.av2=null;
	        this.i1=null;
	        this.i2=null;

	    },

	    preSolve: function( timeStep, invTimeStep ){

	        this.m1 = this.body1.inverseMass;
	        this.m2 = this.body2.inverseMass;

	        var m1m2 = this.m1 + this.m2;

	        this.num = this.manifold.numPoints;

	        var c = this.cs;
	        var p, rvn, len, norImp, norTar, sepV, i1, i2;

	        for( var i=0; i < this.num; i++ ){

	            p = this.ps[i];

	            this.tmpP1.sub( p.position, this.p1 );
	            this.tmpP2.sub( p.position, this.p2 );

	            this.tmpC1.crossVectors( this.av1, this.tmpP1 );
	            this.tmpC2.crossVectors( this.av2, this.tmpP2 );

	            c.norImp = p.normalImpulse;
	            c.tanImp = p.tangentImpulse;
	            c.binImp = p.binormalImpulse;

	            c.nor.copy( p.normal );

	            this.tmp.set(

	                ( this.lv2.x + this.tmpC2.x ) - ( this.lv1.x + this.tmpC1.x ),
	                ( this.lv2.y + this.tmpC2.y ) - ( this.lv1.y + this.tmpC1.y ),
	                ( this.lv2.z + this.tmpC2.z ) - ( this.lv1.z + this.tmpC1.z )

	            );

	            rvn = _Math.dotVectors( c.nor, this.tmp );

	            c.tan.set(
	                this.tmp.x - rvn * c.nor.x,
	                this.tmp.y - rvn * c.nor.y,
	                this.tmp.z - rvn * c.nor.z
	            );

	            len = _Math.dotVectors( c.tan, c.tan );

	            if( len <= 0.04 ) {
	                c.tan.tangent( c.nor );
	            }

	            c.tan.normalize();

	            c.bin.crossVectors( c.nor, c.tan );

	            c.norU1.scale( c.nor, this.m1 );
	            c.norU2.scale( c.nor, this.m2 );

	            c.tanU1.scale( c.tan, this.m1 );
	            c.tanU2.scale( c.tan, this.m2 );

	            c.binU1.scale( c.bin, this.m1 );
	            c.binU2.scale( c.bin, this.m2 );

	            c.norT1.crossVectors( this.tmpP1, c.nor );
	            c.tanT1.crossVectors( this.tmpP1, c.tan );
	            c.binT1.crossVectors( this.tmpP1, c.bin );

	            c.norT2.crossVectors( this.tmpP2, c.nor );
	            c.tanT2.crossVectors( this.tmpP2, c.tan );
	            c.binT2.crossVectors( this.tmpP2, c.bin );

	            i1 = this.i1;
	            i2 = this.i2;

	            c.norTU1.copy( c.norT1 ).applyMatrix3( i1, true );
	            c.tanTU1.copy( c.tanT1 ).applyMatrix3( i1, true );
	            c.binTU1.copy( c.binT1 ).applyMatrix3( i1, true );

	            c.norTU2.copy( c.norT2 ).applyMatrix3( i2, true );
	            c.tanTU2.copy( c.tanT2 ).applyMatrix3( i2, true );
	            c.binTU2.copy( c.binT2 ).applyMatrix3( i2, true );

	            /*c.norTU1.mulMat( this.i1, c.norT1 );
	            c.tanTU1.mulMat( this.i1, c.tanT1 );
	            c.binTU1.mulMat( this.i1, c.binT1 );

	            c.norTU2.mulMat( this.i2, c.norT2 );
	            c.tanTU2.mulMat( this.i2, c.tanT2 );
	            c.binTU2.mulMat( this.i2, c.binT2 );*/

	            this.tmpC1.crossVectors( c.norTU1, this.tmpP1 );
	            this.tmpC2.crossVectors( c.norTU2, this.tmpP2 );
	            this.tmp.add( this.tmpC1, this.tmpC2 );
	            c.norDen = 1 / ( m1m2 +_Math.dotVectors( c.nor, this.tmp ));

	            this.tmpC1.crossVectors( c.tanTU1, this.tmpP1 );
	            this.tmpC2.crossVectors( c.tanTU2, this.tmpP2 );
	            this.tmp.add( this.tmpC1, this.tmpC2 );
	            c.tanDen = 1 / ( m1m2 +_Math.dotVectors( c.tan, this.tmp ));

	            this.tmpC1.crossVectors( c.binTU1, this.tmpP1 );
	            this.tmpC2.crossVectors( c.binTU2, this.tmpP2 );
	            this.tmp.add( this.tmpC1, this.tmpC2 );
	            c.binDen = 1 / ( m1m2 +_Math.dotVectors( c.bin, this.tmp ));

	            if( p.warmStarted ){

	                norImp = p.normalImpulse;

	                this.lv1.addScaledVector( c.norU1, norImp );
	                this.av1.addScaledVector( c.norTU1, norImp );

	                this.lv2.subScaledVector( c.norU2, norImp );
	                this.av2.subScaledVector( c.norTU2, norImp );

	                c.norImp = norImp;
	                c.tanImp = 0;
	                c.binImp = 0;
	                rvn = 0; // disable bouncing

	            } else {

	                c.norImp=0;
	                c.tanImp=0;
	                c.binImp=0;

	            }


	            if(rvn>-1) rvn=0; // disable bouncing
	            
	            norTar = this.restitution*-rvn;
	            sepV = -(p.penetration+0.005)*invTimeStep*0.05; // allow 0.5cm error
	            if(norTar<sepV) norTar=sepV;
	            c.norTar = norTar;
	            c.last = i==this.num-1;
	            c = c.next;
	        }
	    },

	    solve: function(){

	        this.tmplv1.copy( this.lv1 );
	        this.tmplv2.copy( this.lv2 );
	        this.tmpav1.copy( this.av1 );
	        this.tmpav2.copy( this.av2 );

	        var oldImp1, newImp1, oldImp2, newImp2, rvn, norImp, tanImp, binImp, max, len;

	        var c = this.cs;

	        while(true){

	            norImp = c.norImp;
	            tanImp = c.tanImp;
	            binImp = c.binImp;
	            max = -norImp * this.friction;

	            this.tmp.sub( this.tmplv2, this.tmplv1 );

	            rvn = _Math.dotVectors( this.tmp, c.tan ) + _Math.dotVectors( this.tmpav2, c.tanT2 ) - _Math.dotVectors( this.tmpav1, c.tanT1 );
	        
	            oldImp1 = tanImp;
	            newImp1 = rvn*c.tanDen;
	            tanImp += newImp1;

	            rvn = _Math.dotVectors( this.tmp, c.bin ) + _Math.dotVectors( this.tmpav2, c.binT2 ) - _Math.dotVectors( this.tmpav1, c.binT1 );
	      
	            oldImp2 = binImp;
	            newImp2 = rvn*c.binDen;
	            binImp += newImp2;

	            // cone friction clamp
	            len = tanImp*tanImp + binImp*binImp;
	            if(len > max * max ){
	                len = max/_Math.sqrt(len);
	                tanImp *= len;
	                binImp *= len;
	            }

	            newImp1 = tanImp-oldImp1;
	            newImp2 = binImp-oldImp2;

	            //

	            this.tmp.set( 
	                c.tanU1.x*newImp1 + c.binU1.x*newImp2,
	                c.tanU1.y*newImp1 + c.binU1.y*newImp2,
	                c.tanU1.z*newImp1 + c.binU1.z*newImp2
	            );

	            this.tmplv1.addEqual( this.tmp );

	            this.tmp.set(
	                c.tanTU1.x*newImp1 + c.binTU1.x*newImp2,
	                c.tanTU1.y*newImp1 + c.binTU1.y*newImp2,
	                c.tanTU1.z*newImp1 + c.binTU1.z*newImp2
	            );

	            this.tmpav1.addEqual( this.tmp );

	            this.tmp.set(
	                c.tanU2.x*newImp1 + c.binU2.x*newImp2,
	                c.tanU2.y*newImp1 + c.binU2.y*newImp2,
	                c.tanU2.z*newImp1 + c.binU2.z*newImp2
	            );

	            this.tmplv2.subEqual( this.tmp );

	            this.tmp.set(
	                c.tanTU2.x*newImp1 + c.binTU2.x*newImp2,
	                c.tanTU2.y*newImp1 + c.binTU2.y*newImp2,
	                c.tanTU2.z*newImp1 + c.binTU2.z*newImp2
	            );

	            this.tmpav2.subEqual( this.tmp );

	            // restitution part

	            this.tmp.sub( this.tmplv2, this.tmplv1 );

	            rvn = _Math.dotVectors( this.tmp, c.nor ) + _Math.dotVectors( this.tmpav2, c.norT2 ) - _Math.dotVectors( this.tmpav1, c.norT1 );

	            oldImp1 = norImp;
	            newImp1 = (rvn-c.norTar)*c.norDen;
	            norImp += newImp1;
	            if( norImp > 0 ) norImp = 0;

	            newImp1 = norImp - oldImp1;

	            this.tmplv1.addScaledVector( c.norU1, newImp1 );
	            this.tmpav1.addScaledVector( c.norTU1, newImp1 );
	            this.tmplv2.subScaledVector( c.norU2, newImp1 );
	            this.tmpav2.subScaledVector( c.norTU2, newImp1 );

	            c.norImp = norImp;
	            c.tanImp = tanImp;
	            c.binImp = binImp;

	            if(c.last)break;
	            c = c.next;
	        }

	        this.lv1.copy( this.tmplv1 );
	        this.lv2.copy( this.tmplv2 );
	        this.av1.copy( this.tmpav1 );
	        this.av2.copy( this.tmpav2 );

	    },

	    postSolve: function(){

	        var c = this.cs, p;
	        var i = this.num;
	        while(i--){
	        //for(var i=0;i<this.num;i++){
	            p = this.ps[i];
	            p.normal.copy( c.nor );
	            p.tangent.copy( c.tan );
	            p.binormal.copy( c.bin );

	            p.normalImpulse = c.norImp;
	            p.tangentImpulse = c.tanImp;
	            p.binormalImpulse = c.binImp;
	            p.normalDenominator = c.norDen;
	            p.tangentDenominator = c.tanDen;
	            p.binormalDenominator = c.binDen;
	            c=c.next;
	        }
	    }

	});

	/**
	* A contact is a pair of shapes whose axis-aligned bounding boxes are overlapping.
	* @author saharan
	*/

	function Contact(){

	    // The first shape.
	    this.shape1 = null;
	    // The second shape.
	    this.shape2 = null;
	    // The first rigid body.
	    this.body1 = null;
	    // The second rigid body.
	    this.body2 = null;
	    // The previous contact in the world.
	    this.prev = null;
	    // The next contact in the world.
	    this.next = null;
	    // Internal
	    this.persisting = false;
	    // Whether both the rigid bodies are sleeping or not.
	    this.sleeping = false;
	    // The collision detector between two shapes.
	    this.detector = null;
	    // The contact constraint of the contact.
	    this.constraint = null;
	    // Whether the shapes are touching or not.
	    this.touching = false;
	    // shapes is very close and touching 
	    this.close = false;

	    this.dist = _Math.INF;

	    this.b1Link = new ContactLink( this );
	    this.b2Link = new ContactLink( this );
	    this.s1Link = new ContactLink( this );
	    this.s2Link = new ContactLink( this );

	    // The contact manifold of the contact.
	    this.manifold = new ContactManifold();

	    this.buffer = [

	        new ImpulseDataBuffer(),
	        new ImpulseDataBuffer(),
	        new ImpulseDataBuffer(),
	        new ImpulseDataBuffer()

	    ];

	    this.points = this.manifold.points;
	    this.constraint = new ContactConstraint( this.manifold );
	    
	}

	Object.assign( Contact.prototype, {

	    Contact: true,

	    mixRestitution: function ( restitution1, restitution2 ) {

	        return _Math.sqrt(restitution1*restitution2);

	    },
	    mixFriction: function ( friction1, friction2 ) {

	        return _Math.sqrt(friction1*friction2);

	    },

	    /**
	    * Update the contact manifold.
	    */
	    updateManifold: function () {

	        this.constraint.restitution =this.mixRestitution(this.shape1.restitution,this.shape2.restitution);
	        this.constraint.friction=this.mixFriction(this.shape1.friction,this.shape2.friction);
	        var numBuffers=this.manifold.numPoints;
	        var i = numBuffers;
	        while(i--){
	        //for(var i=0;i<numBuffers;i++){
	            var b = this.buffer[i];
	            var p = this.points[i];
	            b.lp1X=p.localPoint1.x;
	            b.lp1Y=p.localPoint1.y;
	            b.lp1Z=p.localPoint1.z;
	            b.lp2X=p.localPoint2.x;
	            b.lp2Y=p.localPoint2.y;
	            b.lp2Z=p.localPoint2.z;
	            b.impulse=p.normalImpulse;
	        }
	        this.manifold.numPoints=0;
	        this.detector.detectCollision(this.shape1,this.shape2,this.manifold);
	        var num=this.manifold.numPoints;
	        if(num==0){
	            this.touching = false;
	            this.close = false;
	            this.dist = _Math.INF;
	            return;
	        }

	        if( this.touching || this.dist < 0.001 ) this.close = true;
	        this.touching=true;
	        i = num;
	        while(i--){
	        //for(i=0; i<num; i++){
	            p=this.points[i];
	            var lp1x=p.localPoint1.x;
	            var lp1y=p.localPoint1.y;
	            var lp1z=p.localPoint1.z;
	            var lp2x=p.localPoint2.x;
	            var lp2y=p.localPoint2.y;
	            var lp2z=p.localPoint2.z;
	            var index=-1;
	            var minDistance=0.0004;
	            var j = numBuffers;
	            while(j--){
	            //for(var j=0;j<numBuffers;j++){
	                b=this.buffer[j];
	                var dx=b.lp1X-lp1x;
	                var dy=b.lp1Y-lp1y;
	                var dz=b.lp1Z-lp1z;
	                var distance1=dx*dx+dy*dy+dz*dz;
	                dx=b.lp2X-lp2x;
	                dy=b.lp2Y-lp2y;
	                dz=b.lp2Z-lp2z;
	                var distance2=dx*dx+dy*dy+dz*dz;
	                if(distance1<distance2){
	                    if(distance1<minDistance){
	                        minDistance=distance1;
	                        index=j;
	                    }
	                }else{
	                    if(distance2<minDistance){
	                        minDistance=distance2;
	                        index=j;
	                    }
	                }

	                if( minDistance < this.dist ) this.dist = minDistance;

	            }
	            if(index!=-1){
	                var tmp=this.buffer[index];
	                this.buffer[index]=this.buffer[--numBuffers];
	                this.buffer[numBuffers]=tmp;
	                p.normalImpulse=tmp.impulse;
	                p.warmStarted=true;
	            }else{
	                p.normalImpulse=0;
	                p.warmStarted=false;
	            }
	        }
	    },
	    /**
	    * Attach the contact to the shapes.
	    * @param   shape1
	    * @param   shape2
	    */
	    attach:function(shape1,shape2){
	        this.shape1=shape1;
	        this.shape2=shape2;
	        this.body1=shape1.parent;
	        this.body2=shape2.parent;

	        this.manifold.body1=this.body1;
	        this.manifold.body2=this.body2;
	        this.constraint.body1=this.body1;
	        this.constraint.body2=this.body2;
	        this.constraint.attach();

	        this.s1Link.shape=shape2;
	        this.s1Link.body=this.body2;
	        this.s2Link.shape=shape1;
	        this.s2Link.body=this.body1;

	        if(shape1.contactLink!=null)(this.s1Link.next=shape1.contactLink).prev=this.s1Link;
	        else this.s1Link.next=null;
	        shape1.contactLink=this.s1Link;
	        shape1.numContacts++;

	        if(shape2.contactLink!=null)(this.s2Link.next=shape2.contactLink).prev=this.s2Link;
	        else this.s2Link.next=null;
	        shape2.contactLink=this.s2Link;
	        shape2.numContacts++;

	        this.b1Link.shape=shape2;
	        this.b1Link.body=this.body2;
	        this.b2Link.shape=shape1;
	        this.b2Link.body=this.body1;

	        if(this.body1.contactLink!=null)(this.b1Link.next=this.body1.contactLink).prev=this.b1Link;
	        else this.b1Link.next=null;
	        this.body1.contactLink=this.b1Link;
	        this.body1.numContacts++;

	        if(this.body2.contactLink!=null)(this.b2Link.next=this.body2.contactLink).prev=this.b2Link;
	        else this.b2Link.next=null;
	        this.body2.contactLink=this.b2Link;
	        this.body2.numContacts++;

	        this.prev=null;
	        this.next=null;

	        this.persisting=true;
	        this.sleeping=this.body1.sleeping&&this.body2.sleeping;
	        this.manifold.numPoints=0;
	    },
	    /**
	    * Detach the contact from the shapes.
	    */
	    detach:function(){
	        var prev=this.s1Link.prev;
	        var next=this.s1Link.next;
	        if(prev!==null)prev.next=next;
	        if(next!==null)next.prev=prev;
	        if(this.shape1.contactLink==this.s1Link)this.shape1.contactLink=next;
	        this.s1Link.prev=null;
	        this.s1Link.next=null;
	        this.s1Link.shape=null;
	        this.s1Link.body=null;
	        this.shape1.numContacts--;

	        prev=this.s2Link.prev;
	        next=this.s2Link.next;
	        if(prev!==null)prev.next=next;
	        if(next!==null)next.prev=prev;
	        if(this.shape2.contactLink==this.s2Link)this.shape2.contactLink=next;
	        this.s2Link.prev=null;
	        this.s2Link.next=null;
	        this.s2Link.shape=null;
	        this.s2Link.body=null;
	        this.shape2.numContacts--;

	        prev=this.b1Link.prev;
	        next=this.b1Link.next;
	        if(prev!==null)prev.next=next;
	        if(next!==null)next.prev=prev;
	        if(this.body1.contactLink==this.b1Link)this.body1.contactLink=next;
	        this.b1Link.prev=null;
	        this.b1Link.next=null;
	        this.b1Link.shape=null;
	        this.b1Link.body=null;
	        this.body1.numContacts--;

	        prev=this.b2Link.prev;
	        next=this.b2Link.next;
	        if(prev!==null)prev.next=next;
	        if(next!==null)next.prev=prev;
	        if(this.body2.contactLink==this.b2Link)this.body2.contactLink=next;
	        this.b2Link.prev=null;
	        this.b2Link.next=null;
	        this.b2Link.shape=null;
	        this.b2Link.body=null;
	        this.body2.numContacts--;

	        this.manifold.body1=null;
	        this.manifold.body2=null;
	        this.constraint.body1=null;
	        this.constraint.body2=null;
	        this.constraint.detach();

	        this.shape1=null;
	        this.shape2=null;
	        this.body1=null;
	        this.body2=null;
	    }

	} );

	/**
	* The class of rigid body.
	* Rigid body has the shape of a single or multiple collision processing,
	* I can set the parameters individually.
	* @author saharan
	* @author lo-th
	*/

	function RigidBody ( Position, Rotation ) {

	    this.position = Position || new Vec3();
	    this.orientation = Rotation || new Quat();

	    this.scale = 1;
	    this.invScale = 1;

	    // possible link to three Mesh;
	    this.mesh = null;

	    this.id = NaN;
	    this.name = "";
	    // The maximum number of shapes that can be added to a one rigid.
	    //this.MAX_SHAPES = 64;//64;

	    this.prev = null;
	    this.next = null;

	    // I represent the kind of rigid body.
	    // Please do not change from the outside this variable.
	    // If you want to change the type of rigid body, always
	    // Please specify the type you want to set the arguments of setupMass method.
	    this.type = BODY_NULL;

	    this.massInfo = new MassInfo();

	    this.newPosition = new Vec3();
	    this.controlPos = false;
	    this.newOrientation = new Quat();
	    this.newRotation = new Vec3();
	    this.currentRotation = new Vec3();
	    this.controlRot = false;
	    this.controlRotInTime = false;

	    this.quaternion = new Quat();
	    this.pos = new Vec3();



	    // Is the translational velocity.
	    this.linearVelocity = new Vec3();
	    // Is the angular velocity.
	    this.angularVelocity = new Vec3();

	    //--------------------------------------------
	    //  Please do not change from the outside this variables.
	    //--------------------------------------------

	    // It is a world that rigid body has been added.
	    this.parent = null;
	    this.contactLink = null;
	    this.numContacts = 0;

	    // An array of shapes that are included in the rigid body.
	    this.shapes = null;
	    // The number of shapes that are included in the rigid body.
	    this.numShapes = 0;

	    // It is the link array of joint that is connected to the rigid body.
	    this.jointLink = null;
	    // The number of joints that are connected to the rigid body.
	    this.numJoints = 0;

	    // It is the world coordinate of the center of gravity in the sleep just before.
	    this.sleepPosition = new Vec3();
	    // It is a quaternion that represents the attitude of sleep just before.
	    this.sleepOrientation = new Quat();
	    // I will show this rigid body to determine whether it is a rigid body static.
	    this.isStatic = false;
	    // I indicates that this rigid body to determine whether it is a rigid body dynamic.
	    this.isDynamic = false;

	    this.isKinematic = false;

	    // It is a rotation matrix representing the orientation.
	    this.rotation = new Mat33();

	    //--------------------------------------------
	    // It will be recalculated automatically from the shape, which is included.
	    //--------------------------------------------

	    // This is the weight.
	    this.mass = 0;
	    // It is the reciprocal of the mass.
	    this.inverseMass = 0;
	    // It is the inverse of the inertia tensor in the world system.
	    this.inverseInertia = new Mat33();
	    // It is the inertia tensor in the initial state.
	    this.localInertia = new Mat33();
	    // It is the inverse of the inertia tensor in the initial state.
	    this.inverseLocalInertia = new Mat33();

	    this.tmpInertia = new Mat33();


	    // I indicates rigid body whether it has been added to the simulation Island.
	    this.addedToIsland = false;
	    // It shows how to sleep rigid body.
	    this.allowSleep = true;
	    // This is the time from when the rigid body at rest.
	    this.sleepTime = 0;
	    // I shows rigid body to determine whether it is a sleep state.
	    this.sleeping = false;

	}

	Object.assign( RigidBody.prototype, {

	    setParent: function ( world ) {

	        this.parent = world;
	        this.scale = this.parent.scale;
	        this.invScale = this.parent.invScale;
	        this.id = this.parent.numRigidBodies;
	        if( !this.name ) this.name = this.id;

	        this.updateMesh();

	    },

	    /**
	     * I'll add a shape to rigid body.
	     * If you add a shape, please call the setupMass method to step up to the start of the next.
	     * @param   shape shape to Add
	     */
	    addShape:function(shape){

	        if(shape.parent){
				printError("RigidBody", "It is not possible that you add a shape which already has an associated body.");
			}

	        if(this.shapes!=null)( this.shapes.prev = shape ).next = this.shapes;
	        this.shapes = shape;
	        shape.parent = this;
	        if(this.parent) this.parent.addShape( shape );
	        this.numShapes++;

	    },
	    /**
	     * I will delete the shape from the rigid body.
	     * If you delete a shape, please call the setupMass method to step up to the start of the next.
	     * @param shape {Shape} to delete
	     * @return void
	     */
	    removeShape:function(shape){

	        var remove = shape;
	        if(remove.parent!=this)return;
	        var prev=remove.prev;
	        var next=remove.next;
	        if(prev!=null) prev.next=next;
	        if(next!=null) next.prev=prev;
	        if(this.shapes==remove)this.shapes=next;
	        remove.prev=null;
	        remove.next=null;
	        remove.parent=null;
	        if(this.parent)this.parent.removeShape(remove);
	        this.numShapes--;

	    },

	    remove: function () {

	        this.dispose();

	    },

	    dispose: function () {

	        this.parent.removeRigidBody( this );

	    },

	    checkContact: function( name ) {

	        this.parent.checkContact( this.name, name );

	    },

	    /**
	     * Calulates mass datas(center of gravity, mass, moment inertia, etc...).
	     * If the parameter type is set to BODY_STATIC, the rigid body will be fixed to the space.
	     * If the parameter adjustPosition is set to true, the shapes' relative positions and
	     * the rigid body's position will be adjusted to the center of gravity.
	     * @param type
	     * @param adjustPosition
	     * @return void
	     */
	    setupMass: function ( type, AdjustPosition ) {

	        var adjustPosition = ( AdjustPosition !== undefined ) ? AdjustPosition : true;

	        this.type = type || BODY_STATIC;
	        this.isDynamic = this.type === BODY_DYNAMIC;
	        this.isStatic = this.type === BODY_STATIC;

	        this.mass = 0;
	        this.localInertia.set(0,0,0,0,0,0,0,0,0);


	        var tmpM = new Mat33();
	        var tmpV = new Vec3();

	        for( var shape = this.shapes; shape !== null; shape = shape.next ){

	            shape.calculateMassInfo( this.massInfo );
	            var shapeMass = this.massInfo.mass;
	            tmpV.addScaledVector(shape.relativePosition, shapeMass);
	            this.mass += shapeMass;
	            this.rotateInertia( shape.relativeRotation, this.massInfo.inertia, tmpM );
	            this.localInertia.add( tmpM );

	            // add offset inertia
	            this.localInertia.addOffset( shapeMass, shape.relativePosition );

	        }

	        this.inverseMass = 1 / this.mass;
	        tmpV.scaleEqual( this.inverseMass );

	        if( adjustPosition ){
	            this.position.add( tmpV );
	            for( shape=this.shapes; shape !== null; shape = shape.next ){
	                shape.relativePosition.subEqual(tmpV);
	            }

	            // subtract offset inertia
	            this.localInertia.subOffset( this.mass, tmpV );

	        }

	        this.inverseLocalInertia.invert( this.localInertia );

	        //}

	        if( this.type === BODY_STATIC ){
	            this.inverseMass = 0;
	            this.inverseLocalInertia.set(0,0,0,0,0,0,0,0,0);
	        }

	        this.syncShapes();
	        this.awake();

	    },
	    /**
	     * Awake the rigid body.
	     */
	    awake:function(){

	        if( !this.allowSleep || !this.sleeping ) return;
	        this.sleeping = false;
	        this.sleepTime = 0;
	        // awake connected constraints
	        var cs = this.contactLink;
	        while(cs != null){
	            cs.body.sleepTime = 0;
	            cs.body.sleeping = false;
	            cs = cs.next;
	        }
	        var js = this.jointLink;
	        while(js != null){
	            js.body.sleepTime = 0;
	            js.body.sleeping = false;
	            js = js.next;
	        }
	        for(var shape = this.shapes; shape!=null; shape = shape.next){
	            shape.updateProxy();
	        }

	    },
	    /**
	     * Sleep the rigid body.
	     */
	    sleep:function(){

	        if( !this.allowSleep || this.sleeping ) return;

	        this.linearVelocity.set(0,0,0);
	        this.angularVelocity.set(0,0,0);
	        this.sleepPosition.copy( this.position );
	        this.sleepOrientation.copy( this.orientation );

	        this.sleepTime = 0;
	        this.sleeping = true;
	        for( var shape = this.shapes; shape != null; shape = shape.next ) {
	            shape.updateProxy();
	        }
	    },

	    testWakeUp: function(){

	        if( this.linearVelocity.testZero() || this.angularVelocity.testZero() || this.position.testDiff( this.sleepPosition ) || this.orientation.testDiff( this.sleepOrientation )) this.awake(); // awake the body

	    },

	    /**
	     * Get whether the rigid body has not any connection with others.
	     * @return {void}
	     */
	    isLonely: function () {
	        return this.numJoints==0 && this.numContacts==0;
	    },

	    /**
	     * The time integration of the motion of a rigid body, you can update the information such as the shape.
	     * This method is invoked automatically when calling the step of the World,
	     * There is no need to call from outside usually.
	     * @param  timeStep time
	     * @return {void}
	     */

	    updatePosition: function ( timeStep ) {
	        switch(this.type){
	            case BODY_STATIC:
	                this.linearVelocity.set(0,0,0);
	                this.angularVelocity.set(0,0,0);

	                // ONLY FOR TEST
	                if(this.controlPos){
	                    this.position.copy(this.newPosition);
	                    this.controlPos = false;
	                }
	                if(this.controlRot){
	                    this.orientation.copy(this.newOrientation);
	                    this.controlRot = false;
	                }
	                /*this.linearVelocity.x=0;
	                this.linearVelocity.y=0;
	                this.linearVelocity.z=0;
	                this.angularVelocity.x=0;
	                this.angularVelocity.y=0;
	                this.angularVelocity.z=0;*/
	            break;
	            case BODY_DYNAMIC:

	                if( this.isKinematic ){

	                    this.linearVelocity.set(0,0,0);
	                    this.angularVelocity.set(0,0,0);

	                }

	                if(this.controlPos){

	                    this.linearVelocity.subVectors( this.newPosition, this.position ).multiplyScalar(1/timeStep);
	                    this.controlPos = false;

	                }
	                if(this.controlRot){

	                    this.angularVelocity.copy( this.getAxis() );
	                    this.orientation.copy( this.newOrientation );
	                    this.controlRot = false;

	                }

	                this.position.addScaledVector(this.linearVelocity, timeStep);
	                this.orientation.addTime(this.angularVelocity, timeStep);

	                this.updateMesh();

	            break;
	            default: printError("RigidBody", "Invalid type.");
	        }

	        this.syncShapes();
	        this.updateMesh();

	    },

	    getAxis: function () {

	        return new Vec3( 0,1,0 ).applyMatrix3( this.inverseLocalInertia, true ).normalize();

	    },

	    rotateInertia: function ( rot, inertia, out ) {

	        this.tmpInertia.multiplyMatrices( rot, inertia );
	        out.multiplyMatrices( this.tmpInertia, rot, true );

	    },

	    syncShapes: function () {

	        this.rotation.setQuat( this.orientation );
	        this.rotateInertia( this.rotation, this.inverseLocalInertia, this.inverseInertia );
	        
	        for(var shape = this.shapes; shape!=null; shape = shape.next){

	            shape.position.copy( shape.relativePosition ).applyMatrix3( this.rotation, true ).add( this.position );
	            // add by QuaziKb
	            shape.rotation.multiplyMatrices( this.rotation, shape.relativeRotation );
	            shape.updateProxy();
	        }
	    },


	    //---------------------------------------------
	    // APPLY IMPULSE FORCE
	    //---------------------------------------------

	    applyImpulse: function(position, force){
	        this.linearVelocity.addScaledVector(force, this.inverseMass);
	        var rel = new Vec3().copy( position ).sub( this.position ).cross( force ).applyMatrix3( this.inverseInertia, true );
	        this.angularVelocity.add( rel );
	    },


	    //---------------------------------------------
	    // SET DYNAMIQUE POSITION AND ROTATION
	    //---------------------------------------------

	    setPosition: function(pos){
	        this.newPosition.copy( pos ).multiplyScalar( this.invScale );
	        this.controlPos = true;
	        if( !this.isKinematic ) this.isKinematic = true;
	    },

	    setQuaternion: function(q){
	        this.newOrientation.set(q.x, q.y, q.z, q.w);
	        this.controlRot = true;
	        if( !this.isKinematic ) this.isKinematic = true;
	    },

	    setRotation: function ( rot ) {

	        this.newOrientation = new Quat().setFromEuler( rot.x * _Math.degtorad, rot.y * _Math.degtorad, rot.y * _Math.degtorad );//this.rotationVectToQuad( rot );
	        this.controlRot = true;

	    },

	    //---------------------------------------------
	    // RESET DYNAMIQUE POSITION AND ROTATION
	    //---------------------------------------------

	    resetPosition:function(x,y,z){

	        this.linearVelocity.set( 0, 0, 0 );
	        this.angularVelocity.set( 0, 0, 0 );
	        this.position.set( x, y, z ).multiplyScalar( this.invScale );
	        //this.position.set( x*OIMO.WorldScale.invScale, y*OIMO.WorldScale.invScale, z*OIMO.WorldScale.invScale );
	        this.awake();
	    },

	    resetQuaternion:function( q ){

	        this.angularVelocity.set(0,0,0);
	        this.orientation = new Quat( q.x, q.y, q.z, q.w );
	        this.awake();

	    },

	    resetRotation:function(x,y,z){

	        this.angularVelocity.set(0,0,0);
	        this.orientation = new Quat().setFromEuler( x * _Math.degtorad, y * _Math.degtorad,  z * _Math.degtorad );//this.rotationVectToQuad( new Vec3(x,y,z) );
	        this.awake();

	    },

	    //---------------------------------------------
	    // GET POSITION AND ROTATION
	    //---------------------------------------------

	    getPosition:function () {

	        return this.pos;

	    },

	    getQuaternion: function () {

	        return this.quaternion;

	    },

	    //---------------------------------------------
	    // AUTO UPDATE THREE MESH
	    //---------------------------------------------

	    connectMesh: function ( mesh ) {

	        this.mesh = mesh;
	        this.updateMesh();

	    },

	    updateMesh: function(){

	        this.pos.scale( this.position, this.scale );
	        this.quaternion.copy( this.orientation );

	        if( this.mesh === null ) return;

	        this.mesh.position.copy( this.getPosition() );
	        this.mesh.quaternion.copy( this.getQuaternion() );

	    },

	} );

	/**
	* A pair of shapes that may collide.
	* @author saharan
	*/
	function Pair ( s1, s2 ){

	    // The first shape.
	    this.shape1 = s1 || null;
	    // The second shape.
	    this.shape2 = s2 || null;

	}

	/**
	* The broad-phase is used for collecting all possible pairs for collision.
	*/

	 function BroadPhase(){

	    this.types = BR_NULL;
	    this.numPairChecks = 0;
	    this.numPairs = 0;
	    this.pairs = [];

	}

	Object.assign( BroadPhase.prototype, {

	    BroadPhase: true,

	    // Create a new proxy.
	    createProxy: function ( shape ) {

	        printError("BroadPhase","Inheritance error.");

	    },

	    // Add the proxy into the broad-phase.
	    addProxy: function ( proxy ) {

	        printError("BroadPhase","Inheritance error.");
	    },

	    // Remove the proxy from the broad-phase.
	    removeProxy: function ( proxy ) {

	        printError("BroadPhase","Inheritance error.");

	    },

	    // Returns whether the pair is available or not.
	    isAvailablePair: function ( s1, s2 ) {

	        var b1 = s1.parent;
	        var b2 = s2.parent;
	        if( b1 == b2 || // same parents
	            (!b1.isDynamic && !b2.isDynamic) || // static or kinematic object
	            (s1.belongsTo&s2.collidesWith)==0 ||
	            (s2.belongsTo&s1.collidesWith)==0 // collision filtering
	        ){ return false; }
	        var js;
	        if(b1.numJoints<b2.numJoints) js = b1.jointLink;
	        else js = b2.jointLink;
	        while(js!==null){
	           var joint = js.joint;
	           if( !joint.allowCollision && ((joint.body1==b1 && joint.body2==b2) || (joint.body1==b2 && joint.body2==b1)) ){ return false; }
	           js = js.next;
	        }

	        return true;

	    },

	    // Detect overlapping pairs.
	    detectPairs: function () {

	        // clear old
	        this.pairs = [];
	        this.numPairs = 0;
	        this.numPairChecks = 0;
	        this.collectPairs();

	    },

	    collectPairs: function () {

	        Error("BroadPhase", "Inheritance error.");

	    },

	    addPair: function ( s1, s2 ) {

	        var pair = new Pair( s1, s2 );
	        this.pairs.push(pair);
	        this.numPairs++;

	    }

	});

	var count$1 = 0;
	function ProxyIdCount() { return count$1++; }

	/**
	 * A proxy is used for broad-phase collecting pairs that can be colliding.
	 *
	 * @author lo-th
	 */

	function Proxy( shape ) {

		//The parent shape.
	    this.shape = shape;

	    //The axis-aligned bounding box.
	    this.aabb = shape.aabb;

	}

	Object.assign( Proxy.prototype, {

	    Proxy: true,

		// Update the proxy. Must be inherited by a child.

	    update: function(){

	        printError("Proxy","Inheritance error.");

	    }

	});

	/**
	* A basic implementation of proxies.
	*
	* @author saharan
	*/

	function BasicProxy ( shape ) {

	    Proxy.call( this, shape );

	    this.id = ProxyIdCount();

	}

	BasicProxy.prototype = Object.assign( Object.create( Proxy.prototype ), {

	    constructor: BasicProxy,

	    update: function () {

	    }

	});

	/**
	* A broad-phase algorithm with brute-force search.
	* This always checks for all possible pairs.
	*/

	function BruteForceBroadPhase(){

	    BroadPhase.call( this );
	    this.types = BR_BRUTE_FORCE;
	    //this.numProxies=0;
	    ///this.maxProxies = 256;
	    this.proxies = [];
	    //this.proxies.length = 256;

	}


	BruteForceBroadPhase.prototype = Object.assign( Object.create( BroadPhase.prototype ), {

	    constructor: BruteForceBroadPhase,

	    createProxy: function ( shape ) {

	        return new BasicProxy( shape );

	    },

	    addProxy: function ( proxy ) {

	        /*if(this.numProxies==this.maxProxies){
	            //this.maxProxies<<=1;
	            this.maxProxies*=2;
	            var newProxies=[];
	            newProxies.length = this.maxProxies;
	            var i = this.numProxies;
	            while(i--){
	            //for(var i=0, l=this.numProxies;i<l;i++){
	                newProxies[i]=this.proxies[i];
	            }
	            this.proxies=newProxies;
	        }*/
	        //this.proxies[this.numProxies++] = proxy;
	        this.proxies.push( proxy );
	        //this.numProxies++;

	    },

	    removeProxy: function ( proxy ) {

	        var n = this.proxies.indexOf( proxy );
	        if ( n > -1 ){
	            this.proxies.splice( n, 1 );
	            //this.numProxies--;
	        }

	        /*var i = this.numProxies;
	        while(i--){
	        //for(var i=0, l=this.numProxies;i<l;i++){
	            if(this.proxies[i] == proxy){
	                this.proxies[i] = this.proxies[--this.numProxies];
	                this.proxies[this.numProxies] = null;
	                return;
	            }
	        }*/

	    },

	    collectPairs: function () {

	        var i = 0, j, p1, p2;

	        var px = this.proxies;
	        var l = px.length;//this.numProxies;
	        //var ar1 = [];
	        //var ar2 = [];

	        //for( i = px.length ; i-- ; ar1[ i ] = px[ i ] ){};
	        //for( i = px.length ; i-- ; ar2[ i ] = px[ i ] ){};

	        //var ar1 = JSON.parse(JSON.stringify(this.proxies))
	        //var ar2 = JSON.parse(JSON.stringify(this.proxies))

	        this.numPairChecks = l*(l-1)>>1;
	        //this.numPairChecks=this.numProxies*(this.numProxies-1)*0.5;

	        while( i < l ){
	            p1 = px[i++];
	            j = i + 1;
	            while( j < l ){
	                p2 = px[j++];
	                if ( p1.aabb.intersectTest( p2.aabb ) || !this.isAvailablePair( p1.shape, p2.shape ) ) continue;
	                this.addPair( p1.shape, p2.shape );
	            }
	        }

	    }

	});

	/**
	 * A projection axis for sweep and prune broad-phase.
	 * @author saharan
	 */

	function SAPAxis (){

	    this.numElements = 0;
	    this.bufferSize = 256;
	    this.elements = [];
	    this.elements.length = this.bufferSize;
	    this.stack = new Float32Array( 64 );

	}

	Object.assign( SAPAxis.prototype, {

	    SAPAxis: true,

	    addElements: function ( min, max ) {

	        if(this.numElements+2>=this.bufferSize){
	            //this.bufferSize<<=1;
	            this.bufferSize*=2;
	            var newElements=[];
	            var i = this.numElements;
	            while(i--){
	            //for(var i=0, l=this.numElements; i<l; i++){
	                newElements[i] = this.elements[i];
	            }
	        }
	        this.elements[this.numElements++] = min;
	        this.elements[this.numElements++] = max;

	    },

	    removeElements: function ( min, max ) {

	        var minIndex=-1;
	        var maxIndex=-1;
	        for(var i=0, l=this.numElements; i<l; i++){
	            var e=this.elements[i];
	            if(e==min||e==max){
	                if(minIndex==-1){
	                    minIndex=i;
	                }else{
	                    maxIndex=i;
	                break;
	                }
	            }
	        }
	        for(i = minIndex+1, l = maxIndex; i < l; i++){
	            this.elements[i-1] = this.elements[i];
	        }
	        for(i = maxIndex+1, l = this.numElements; i < l; i++){
	            this.elements[i-2] = this.elements[i];
	        }

	        this.elements[--this.numElements] = null;
	        this.elements[--this.numElements] = null;

	    },

	    sort: function () {

	        var count = 0;
	        var threshold = 1;
	        while((this.numElements >> threshold) != 0 ) threshold++;
	        threshold = threshold * this.numElements >> 2;
	        count = 0;

	        var giveup = false;
	        var elements = this.elements;
	        for( var i = 1, l = this.numElements; i < l; i++){ // try insertion sort
	            var tmp=elements[i];
	            var pivot=tmp.value;
	            var tmp2=elements[i-1];
	            if(tmp2.value>pivot){
	                var j=i;
	                do{
	                    elements[j]=tmp2;
	                    if(--j==0)break;
	                    tmp2=elements[j-1];
	                }while(tmp2.value>pivot);
	                elements[j]=tmp;
	                count+=i-j;
	                if(count>threshold){
	                    giveup=true; // stop and use quick sort
	                    break;
	                }
	            }
	        }
	        if(!giveup)return;
	        count=2;var stack=this.stack;
	        stack[0]=0;
	        stack[1]=this.numElements-1;
	        while(count>0){
	            var right=stack[--count];
	            var left=stack[--count];
	            var diff=right-left;
	            if(diff>16){  // quick sort
	                //var mid=left+(diff>>1);
	                var mid = left + (_Math.floor(diff*0.5));
	                tmp = elements[mid];
	                elements[mid] = elements[right];
	                elements[right] = tmp;
	                pivot = tmp.value;
	                i = left-1;
	                j = right;
	                while( true ){
	                    var ei;
	                    var ej;
	                    do{ ei = elements[++i]; } while( ei.value < pivot);
	                    do{ ej = elements[--j]; } while( pivot < ej.value && j != left );
	                    if( i >= j ) break;
	                    elements[i] = ej;
	                    elements[j] = ei;
	                }

	                elements[right] = elements[i];
	                elements[i] = tmp;
	                if( i - left > right - i ) {
	                    stack[count++] = left;
	                    stack[count++] = i - 1;
	                    stack[count++] = i + 1;
	                    stack[count++] = right;
	                }else{
	                    stack[count++] = i + 1;
	                    stack[count++] = right;
	                    stack[count++] = left;
	                    stack[count++] = i - 1;
	                }
	            }else{
	                for( i = left + 1; i <= right; i++ ) {
	                    tmp = elements[i];
	                    pivot = tmp.value;
	                    tmp2 = elements[i-1];
	                    if( tmp2.value > pivot ) {
	                        j = i;
	                        do{
	                            elements[j] = tmp2;
	                            if( --j == 0 ) break;
	                            tmp2 = elements[j-1];
	                        }while( tmp2.value > pivot );
	                        elements[j] = tmp;
	                    }
	                }
	            }
	        }
	        
	    },

	    calculateTestCount: function () {

	        var num = 1;
	        var sum = 0;
	        for(var i = 1, l = this.numElements; i<l; i++){
	            if(this.elements[i].max){
	                num--;
	            }else{
	                sum += num;
	                num++;
	            }
	        }
	        return sum;

	    }

	});

	/**
	 * An element of proxies.
	 * @author saharan
	 */

	function SAPElement ( proxy, max ) {

	    // The parent proxy
	    this.proxy = proxy;
		// The pair element.
	    this.pair = null;
	    // The minimum element on other axis.
	    this.min1 = null;
	    // The maximum element on other axis.
	    this.max1 = null;
	    // The minimum element on other axis.
	    this.min2 = null;
	    // The maximum element on other axis.
	    this.max2 = null;
	    // Whether the element has maximum value or not.
	    this.max = max;
	    // The value of the element.
	    this.value = 0;

	}

	/**
	 * A proxy for sweep and prune broad-phase.
	 * @author saharan
	 * @author lo-th
	 */

	function SAPProxy ( sap, shape ){

	    Proxy.call( this, shape );
	    // Type of the axis to which the proxy belongs to. [0:none, 1:dynamic, 2:static]
	    this.belongsTo = 0;
	    // The maximum elements on each axis.
	    this.max = [];
	    // The minimum elements on each axis.
	    this.min = [];
	    
	    this.sap = sap;
	    this.min[0] = new SAPElement( this, false );
	    this.max[0] = new SAPElement( this, true );
	    this.min[1] = new SAPElement( this, false );
	    this.max[1] = new SAPElement( this, true );
	    this.min[2] = new SAPElement( this, false );
	    this.max[2] = new SAPElement( this, true );
	    this.max[0].pair = this.min[0];
	    this.max[1].pair = this.min[1];
	    this.max[2].pair = this.min[2];
	    this.min[0].min1 = this.min[1];
	    this.min[0].max1 = this.max[1];
	    this.min[0].min2 = this.min[2];
	    this.min[0].max2 = this.max[2];
	    this.min[1].min1 = this.min[0];
	    this.min[1].max1 = this.max[0];
	    this.min[1].min2 = this.min[2];
	    this.min[1].max2 = this.max[2];
	    this.min[2].min1 = this.min[0];
	    this.min[2].max1 = this.max[0];
	    this.min[2].min2 = this.min[1];
	    this.min[2].max2 = this.max[1];

	}

	SAPProxy.prototype = Object.assign( Object.create( Proxy.prototype ), {

	    constructor: SAPProxy,


	    // Returns whether the proxy is dynamic or not.
	    isDynamic: function () {

	        var body = this.shape.parent;
	        return body.isDynamic && !body.sleeping;

	    },

	    update: function () {

	        var te = this.aabb.elements;
	        this.min[0].value = te[0];
	        this.min[1].value = te[1];
	        this.min[2].value = te[2];
	        this.max[0].value = te[3];
	        this.max[1].value = te[4];
	        this.max[2].value = te[5];

	        if( this.belongsTo == 1 && !this.isDynamic() || this.belongsTo == 2 && this.isDynamic() ){
	            this.sap.removeProxy(this);
	            this.sap.addProxy(this);
	        }

	    }

	});

	/**
	 * A broad-phase collision detection algorithm using sweep and prune.
	 * @author saharan
	 * @author lo-th
	 */

	function SAPBroadPhase () {

	    BroadPhase.call( this);
	    this.types = BR_SWEEP_AND_PRUNE;

	    this.numElementsD = 0;
	    this.numElementsS = 0;
	    // dynamic proxies
	    this.axesD = [
	       new SAPAxis(),
	       new SAPAxis(),
	       new SAPAxis()
	    ];
	    // static or sleeping proxies
	    this.axesS = [
	       new SAPAxis(),
	       new SAPAxis(),
	       new SAPAxis()
	    ];

	    this.index1 = 0;
	    this.index2 = 1;

	}

	SAPBroadPhase.prototype = Object.assign( Object.create( BroadPhase.prototype ), {

	    constructor: SAPBroadPhase,

	    createProxy: function ( shape ) {

	        return new SAPProxy( this, shape );

	    },

	    addProxy: function ( proxy ) {

	        var p = proxy;
	        if(p.isDynamic()){
	            this.axesD[0].addElements( p.min[0], p.max[0] );
	            this.axesD[1].addElements( p.min[1], p.max[1] );
	            this.axesD[2].addElements( p.min[2], p.max[2] );
	            p.belongsTo = 1;
	            this.numElementsD += 2;
	        } else {
	            this.axesS[0].addElements( p.min[0], p.max[0] );
	            this.axesS[1].addElements( p.min[1], p.max[1] );
	            this.axesS[2].addElements( p.min[2], p.max[2] );
	            p.belongsTo = 2;
	            this.numElementsS += 2;
	        }

	    },

	    removeProxy: function ( proxy ) {

	        var p = proxy;
	        if ( p.belongsTo == 0 ) return;

	        /*else if ( p.belongsTo == 1 ) {
	            this.axesD[0].removeElements( p.min[0], p.max[0] );
	            this.axesD[1].removeElements( p.min[1], p.max[1] );
	            this.axesD[2].removeElements( p.min[2], p.max[2] );
	            this.numElementsD -= 2;
	        } else if ( p.belongsTo == 2 ) {
	            this.axesS[0].removeElements( p.min[0], p.max[0] );
	            this.axesS[1].removeElements( p.min[1], p.max[1] );
	            this.axesS[2].removeElements( p.min[2], p.max[2] );
	            this.numElementsS -= 2;
	        }*/

	        switch( p.belongsTo ){
	            case 1:
	            this.axesD[0].removeElements( p.min[0], p.max[0] );
	            this.axesD[1].removeElements( p.min[1], p.max[1] );
	            this.axesD[2].removeElements( p.min[2], p.max[2] );
	            this.numElementsD -= 2;
	            break;
	            case 2:
	            this.axesS[0].removeElements( p.min[0], p.max[0] );
	            this.axesS[1].removeElements( p.min[1], p.max[1] );
	            this.axesS[2].removeElements( p.min[2], p.max[2] );
	            this.numElementsS -= 2;
	            break;
	        }

	        p.belongsTo = 0;

	    },

	    collectPairs: function () {

	        if( this.numElementsD == 0 ) return;

	        var axis1 = this.axesD[this.index1];
	        var axis2 = this.axesD[this.index2];

	        axis1.sort();
	        axis2.sort();

	        var count1 = axis1.calculateTestCount();
	        var count2 = axis2.calculateTestCount();
	        var elementsD;
	        var elementsS;
	        if( count1 <= count2 ){// select the best axis
	            axis2 = this.axesS[this.index1];
	            axis2.sort();
	            elementsD = axis1.elements;
	            elementsS = axis2.elements;
	        }else{
	            axis1 = this.axesS[this.index2];
	            axis1.sort();
	            elementsD = axis2.elements;
	            elementsS = axis1.elements;
	            this.index1 ^= this.index2;
	            this.index2 ^= this.index1;
	            this.index1 ^= this.index2;
	        }
	        var activeD;
	        var activeS;
	        var p = 0;
	        var q = 0;
	        while( p < this.numElementsD ){
	            var e1;
	            var dyn;
	            if (q == this.numElementsS ){
	                e1 = elementsD[p];
	                dyn = true;
	                p++;
	            }else{
	                var d = elementsD[p];
	                var s = elementsS[q];
	                if( d.value < s.value ){
	                    e1 = d;
	                    dyn = true;
	                    p++;
	                }else{
	                    e1 = s;
	                    dyn = false;
	                    q++;
	                }
	            }
	            if( !e1.max ){
	                var s1 = e1.proxy.shape;
	                var min1 = e1.min1.value;
	                var max1 = e1.max1.value;
	                var min2 = e1.min2.value;
	                var max2 = e1.max2.value;

	                for( var e2 = activeD; e2 != null; e2 = e2.pair ) {// test for dynamic
	                    var s2 = e2.proxy.shape;

	                    this.numPairChecks++;
	                    if( min1 > e2.max1.value || max1 < e2.min1.value || min2 > e2.max2.value || max2 < e2.min2.value || !this.isAvailablePair( s1, s2 ) ) continue;
	                    this.addPair( s1, s2 );
	                }
	                if( dyn ){
	                    for( e2 = activeS; e2 != null; e2 = e2.pair ) {// test for static
	                        s2 = e2.proxy.shape;

	                        this.numPairChecks++;

	                        if( min1 > e2.max1.value || max1 < e2.min1.value|| min2 > e2.max2.value || max2 < e2.min2.value || !this.isAvailablePair(s1,s2) ) continue;
	                        this.addPair( s1, s2 );
	                    }
	                    e1.pair = activeD;
	                    activeD = e1;
	                }else{
	                    e1.pair = activeS;
	                    activeS = e1;
	                }
	            }else{
	                var min = e1.pair;
	                if( dyn ){
	                    if( min == activeD ){
	                        activeD = activeD.pair;
	                        continue;
	                    }else{
	                        e1 = activeD;
	                    }
	                }else{
	                    if( min == activeS ){
	                        activeS = activeS.pair;
	                        continue;
	                    }else{
	                        e1 = activeS;
	                    }
	                }
	                do{
	                    e2 = e1.pair;
	                    if( e2 == min ){
	                        e1.pair = e2.pair;
	                        break;
	                    }
	                    e1 = e2;
	                }while( e1 != null );
	            }
	        }
	        this.index2 = (this.index1|this.index2)^3;
	        
	    }

	});

	/**
	* A node of the dynamic bounding volume tree.
	* @author saharan
	*/

	function DBVTNode(){
	    
		// The first child node of this node.
	    this.child1 = null;
	    // The second child node of this node.
	    this.child2 = null;
	    //  The parent node of this tree.
	    this.parent = null;
	    // The proxy of this node. This has no value if this node is not leaf.
	    this.proxy = null;
	    // The maximum distance from leaf nodes.
	    this.height = 0;
	    // The AABB of this node.
	    this.aabb = new AABB();

	}

	/**
	 * A dynamic bounding volume tree for the broad-phase algorithm.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function DBVT(){

	    // The root of the tree.
	    this.root = null;
	    this.freeNodes = [];
	    this.freeNodes.length = 16384;
	    this.numFreeNodes = 0;
	    this.aabb = new AABB();

	}

	Object.assign( DBVT.prototype, {

	    DBVT: true,

	    moveLeaf: function( leaf ) {

	        this.deleteLeaf( leaf );
	        this.insertLeaf( leaf );
	    
	    },

	    insertLeaf: function ( leaf ) {

	        if(this.root == null){
	            this.root = leaf;
	            return;
	        }
	        var lb = leaf.aabb;
	        var sibling = this.root;
	        var oldArea;
	        var newArea;
	        while(sibling.proxy == null){ // descend the node to search the best pair
	            var c1 = sibling.child1;
	            var c2 = sibling.child2;
	            var b = sibling.aabb;
	            var c1b = c1.aabb;
	            var c2b = c2.aabb;
	            oldArea = b.surfaceArea();
	            this.aabb.combine(lb,b);
	            newArea = this.aabb.surfaceArea();
	            var creatingCost = newArea*2;
	            var incrementalCost = (newArea-oldArea)*2; // cost of creating a new pair with the node
	            var discendingCost1 = incrementalCost;
	            this.aabb.combine(lb,c1b);
	            if(c1.proxy!=null){
	                // leaf cost = area(combined aabb)
	                discendingCost1+=this.aabb.surfaceArea();
	            }else{
	                // node cost = area(combined aabb) - area(old aabb)
	                discendingCost1+=this.aabb.surfaceArea()-c1b.surfaceArea();
	            }
	            var discendingCost2=incrementalCost;
	            this.aabb.combine(lb,c2b);
	            if(c2.proxy!=null){
	                // leaf cost = area(combined aabb)
	                discendingCost2+=this.aabb.surfaceArea();
	            }else{
	                // node cost = area(combined aabb) - area(old aabb)
	                discendingCost2+=this.aabb.surfaceArea()-c2b.surfaceArea();
	            }
	            if(discendingCost1<discendingCost2){
	                if(creatingCost<discendingCost1){
	                    break;// stop descending
	                }else{
	                    sibling = c1;// descend into first child
	                }
	            }else{
	                if(creatingCost<discendingCost2){
	                    break;// stop descending
	                }else{
	                    sibling = c2;// descend into second child
	                }
	            }
	        }
	        var oldParent = sibling.parent;
	        var newParent;
	        if(this.numFreeNodes>0){
	            newParent = this.freeNodes[--this.numFreeNodes];
	        }else{
	            newParent = new DBVTNode();
	        }

	        newParent.parent = oldParent;
	        newParent.child1 = leaf;
	        newParent.child2 = sibling;
	        newParent.aabb.combine(leaf.aabb,sibling.aabb);
	        newParent.height = sibling.height+1;
	        sibling.parent = newParent;
	        leaf.parent = newParent;
	        if(sibling == this.root){
	            // replace root
	            this.root = newParent;
	        }else{
	            // replace child
	            if(oldParent.child1 == sibling){
	                oldParent.child1 = newParent;
	            }else{
	                oldParent.child2 = newParent;
	            }
	        }
	        // update whole tree
	        do{
	            newParent = this.balance(newParent);
	            this.fix(newParent);
	            newParent = newParent.parent;
	        }while(newParent != null);
	    },

	    getBalance: function( node ) {

	        if(node.proxy!=null)return 0;
	        return node.child1.height-node.child2.height;

	    },

	    deleteLeaf: function( leaf ) {

	        if(leaf == this.root){
	            this.root = null;
	            return;
	        }
	        var parent = leaf.parent;
	        var sibling;
	        if(parent.child1==leaf){
	            sibling=parent.child2;
	        }else{
	            sibling=parent.child1;
	        }
	        if(parent==this.root){
	            this.root=sibling;
	            sibling.parent=null;
	            return;
	        }
	        var grandParent = parent.parent;
	        sibling.parent = grandParent;
	        if(grandParent.child1 == parent ) {
	            grandParent.child1 = sibling;
	        }else{
	            grandParent.child2 = sibling;
	        }
	        if(this.numFreeNodes<16384){
	            this.freeNodes[this.numFreeNodes++] = parent;
	        }
	        do{
	            grandParent = this.balance(grandParent);
	            this.fix(grandParent);
	            grandParent = grandParent.parent;
	        }while( grandParent != null );
	    
	    },

	    balance: function( node ) {

	        var nh = node.height;
	        if(nh<2){
	            return node;
	        }
	        var p = node.parent;
	        var l = node.child1;
	        var r = node.child2;
	        var lh = l.height;
	        var rh = r.height;
	        var balance = lh-rh;
	        var t;// for bit operation

	        //          [ N ]
	        //         /     \
	        //    [ L ]       [ R ]
	        //     / \         / \
	        // [L-L] [L-R] [R-L] [R-R]

	        // Is the tree balanced?
	        if(balance>1){
	            var ll = l.child1;
	            var lr = l.child2;
	            var llh = ll.height;
	            var lrh = lr.height;

	            // Is L-L higher than L-R?
	            if(llh>lrh){
	                // set N to L-R
	                l.child2 = node;
	                node.parent = l;

	                //          [ L ]
	                //         /     \
	                //    [L-L]       [ N ]
	                //     / \         / \
	                // [...] [...] [ L ] [ R ]
	                
	                // set L-R
	                node.child1 = lr;
	                lr.parent = node;

	                //          [ L ]
	                //         /     \
	                //    [L-L]       [ N ]
	                //     / \         / \
	                // [...] [...] [L-R] [ R ]
	                
	                // fix bounds and heights
	                node.aabb.combine( lr.aabb, r.aabb );
	                t = lrh-rh;
	                node.height=lrh-(t&t>>31)+1;
	                l.aabb.combine(ll.aabb,node.aabb);
	                t=llh-nh;
	                l.height=llh-(t&t>>31)+1;
	            }else{
	                // set N to L-L
	                l.child1=node;
	                node.parent=l;

	                //          [ L ]
	                //         /     \
	                //    [ N ]       [L-R]
	                //     / \         / \
	                // [ L ] [ R ] [...] [...]
	                
	                // set L-L
	                node.child1 = ll;
	                ll.parent = node;

	                //          [ L ]
	                //         /     \
	                //    [ N ]       [L-R]
	                //     / \         / \
	                // [L-L] [ R ] [...] [...]
	                
	                // fix bounds and heights
	                node.aabb.combine(ll.aabb,r.aabb);
	                t = llh - rh;
	                node.height=llh-(t&t>>31)+1;

	                l.aabb.combine(node.aabb,lr.aabb);
	                t=nh-lrh;
	                l.height=nh-(t&t>>31)+1;
	            }
	            // set new parent of L
	            if(p!=null){
	                if(p.child1==node){
	                    p.child1=l;
	                }else{
	                    p.child2=l;
	                }
	            }else{
	                this.root=l;
	            }
	            l.parent=p;
	            return l;
	        }else if(balance<-1){
	            var rl = r.child1;
	            var rr = r.child2;
	            var rlh = rl.height;
	            var rrh = rr.height;

	            // Is R-L higher than R-R?
	            if( rlh > rrh ) {
	                // set N to R-R
	                r.child2 = node;
	                node.parent = r;

	                //          [ R ]
	                //         /     \
	                //    [R-L]       [ N ]
	                //     / \         / \
	                // [...] [...] [ L ] [ R ]
	                
	                // set R-R
	                node.child2 = rr;
	                rr.parent = node;

	                //          [ R ]
	                //         /     \
	                //    [R-L]       [ N ]
	                //     / \         / \
	                // [...] [...] [ L ] [R-R]
	                
	                // fix bounds and heights
	                node.aabb.combine(l.aabb,rr.aabb);
	                t = lh-rrh;
	                node.height = lh-(t&t>>31)+1;
	                r.aabb.combine(rl.aabb,node.aabb);
	                t = rlh-nh;
	                r.height = rlh-(t&t>>31)+1;
	            }else{
	                // set N to R-L
	                r.child1 = node;
	                node.parent = r;
	                //          [ R ]
	                //         /     \
	                //    [ N ]       [R-R]
	                //     / \         / \
	                // [ L ] [ R ] [...] [...]
	                
	                // set R-L
	                node.child2 = rl;
	                rl.parent = node;

	                //          [ R ]
	                //         /     \
	                //    [ N ]       [R-R]
	                //     / \         / \
	                // [ L ] [R-L] [...] [...]
	                
	                // fix bounds and heights
	                node.aabb.combine(l.aabb,rl.aabb);
	                t=lh-rlh;
	                node.height=lh-(t&t>>31)+1;
	                r.aabb.combine(node.aabb,rr.aabb);
	                t=nh-rrh;
	                r.height=nh-(t&t>>31)+1;
	            }
	            // set new parent of R
	            if(p!=null){
	                if(p.child1==node){
	                    p.child1=r;
	                }else{
	                    p.child2=r;
	                }
	            }else{
	                this.root=r;
	            }
	            r.parent=p;
	            return r;
	        }
	        return node;
	    },

	    fix: function ( node ) {

	        var c1 = node.child1;
	        var c2 = node.child2;
	        node.aabb.combine( c1.aabb, c2.aabb );
	        node.height = c1.height < c2.height ? c2.height+1 : c1.height+1; 

	    }
	    
	});

	/**
	* A proxy for dynamic bounding volume tree broad-phase.
	* @author saharan
	*/

	function DBVTProxy ( shape ) {

	    Proxy.call( this, shape);
	    // The leaf of the proxy.
	    this.leaf = new DBVTNode();
	    this.leaf.proxy = this;

	}

	DBVTProxy.prototype = Object.assign( Object.create( Proxy.prototype ), {

	    constructor: DBVTProxy,

	    update: function () {

	    }

	});

	/**
	 * A broad-phase algorithm using dynamic bounding volume tree.
	 *
	 * @author saharan
	 * @author lo-th
	 */

	function DBVTBroadPhase(){

	    BroadPhase.call( this );

	    this.types = BR_BOUNDING_VOLUME_TREE;

	    this.tree = new DBVT();
	    this.stack = [];
	    this.leaves = [];
	    this.numLeaves = 0;

	}

	DBVTBroadPhase.prototype = Object.assign( Object.create( BroadPhase.prototype ), {

	    constructor: DBVTBroadPhase,

	    createProxy: function ( shape ) {

	        return new DBVTProxy( shape );

	    },

	    addProxy: function ( proxy ) {

	        this.tree.insertLeaf( proxy.leaf );
	        this.leaves.push( proxy.leaf );
	        this.numLeaves++;

	    },

	    removeProxy: function ( proxy ) {

	        this.tree.deleteLeaf( proxy.leaf );
	        var n = this.leaves.indexOf( proxy.leaf );
	        if ( n > -1 ) {
	            this.leaves.splice(n,1);
	            this.numLeaves--;
	        }

	    },

	    collectPairs: function () {

	        if ( this.numLeaves < 2 ) return;

	        var leaf, margin = 0.1, i = this.numLeaves;

	        while(i--){

	            leaf = this.leaves[i];

	            if ( leaf.proxy.aabb.intersectTestTwo( leaf.aabb ) ){

	                leaf.aabb.copy( leaf.proxy.aabb, margin );
	                this.tree.deleteLeaf( leaf );
	                this.tree.insertLeaf( leaf );
	                this.collide( leaf, this.tree.root );

	            }
	        }

	    },

	    collide: function ( node1, node2 ) {

	        var stackCount = 2;
	        var s1, s2, n1, n2, l1, l2;
	        this.stack[0] = node1;
	        this.stack[1] = node2;

	        while( stackCount > 0 ){

	            n1 = this.stack[--stackCount];
	            n2 = this.stack[--stackCount];
	            l1 = n1.proxy != null;
	            l2 = n2.proxy != null;
	            
	            this.numPairChecks++;

	            if( l1 && l2 ){
	                s1 = n1.proxy.shape;
	                s2 = n2.proxy.shape;
	                if ( s1 == s2 || s1.aabb.intersectTest( s2.aabb ) || !this.isAvailablePair( s1, s2 ) ) continue;

	                this.addPair(s1,s2);

	            }else{

	                if ( n1.aabb.intersectTest( n2.aabb ) ) continue;
	                
	                /*if(stackCount+4>=this.maxStack){// expand the stack
	                    //this.maxStack<<=1;
	                    this.maxStack*=2;
	                    var newStack = [];// vector
	                    newStack.length = this.maxStack;
	                    for(var i=0;i<stackCount;i++){
	                        newStack[i] = this.stack[i];
	                    }
	                    this.stack = newStack;
	                }*/

	                if( l2 || !l1 && (n1.aabb.surfaceArea() > n2.aabb.surfaceArea()) ){
	                    this.stack[stackCount++] = n1.child1;
	                    this.stack[stackCount++] = n2;
	                    this.stack[stackCount++] = n1.child2;
	                    this.stack[stackCount++] = n2;
	                }else{
	                    this.stack[stackCount++] = n1;
	                    this.stack[stackCount++] = n2.child1;
	                    this.stack[stackCount++] = n1;
	                    this.stack[stackCount++] = n2.child2;
	                }
	            }
	        }

	    }

	});

	function CollisionDetector (){

	    this.flip = false;

	}

	Object.assign( CollisionDetector.prototype, {

	    CollisionDetector: true,

	    detectCollision: function ( shape1, shape2, manifold ) {

	        printError("CollisionDetector", "Inheritance error.");

	    }

	} );

	/**
	 * A collision detector which detects collisions between two boxes.
	 * @author saharan
	 */
	function BoxBoxCollisionDetector() {

	    CollisionDetector.call( this );
	    this.clipVertices1 = new Float32Array( 24 ); // 8 vertices x,y,z
	    this.clipVertices2 = new Float32Array( 24 );
	    this.used = new Float32Array( 8 );
	    
	    this.INF = 1/0;

	}

	BoxBoxCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: BoxBoxCollisionDetector,

	    detectCollision: function ( shape1, shape2, manifold ) {
	        // What you are doing 
	        // · I to prepare a separate axis of the fifteen 
	        //-Six in each of three normal vectors of the xyz direction of the box both 
	        // · Remaining nine 3x3 a vector perpendicular to the side of the box 2 and the side of the box 1 
	        // · Calculate the depth to the separation axis 

	        // Calculates the distance using the inner product and put the amount of embedment 
	        // · However a vertical separation axis and side to weight a little to avoid vibration 
	        // And end when there is a separate axis that is remote even one 
	        // · I look for separation axis with little to dent most 
	        // Men and if separation axis of the first six - end collision 
	        // Heng If it separate axis of nine other - side collision 
	        // Heng - case of a side collision 
	        // · Find points of two sides on which you made ​​the separation axis 

	        // Calculates the point of closest approach of a straight line consisting of separate axis points obtained, and the collision point 
	        //-Surface - the case of the plane crash 
	        //-Box A, box B and the other a box of better made ​​a separate axis 
	        // • The surface A and the plane that made the separation axis of the box A, and B to the surface the face of the box B close in the opposite direction to the most isolated axis 

	        // When viewed from the front surface A, and the cut part exceeding the area of the surface A is a surface B 
	        //-Plane B becomes the 3-8 triangle, I a candidate for the collision point the vertex of surface B 
	        // • If more than one candidate 5 exists, scraping up to four 

	        // For potential collision points of all, to examine the distance between the surface A 
	        // • If you were on the inside surface of A, and the collision point

	        var b1;
	        var b2;
	        if(shape1.id<shape2.id){
	            b1=(shape1);
	            b2=(shape2);
	        }else{
	            b1=(shape2);
	            b2=(shape1);
	        }
	        var V1 = b1.elements;
	        var V2 = b2.elements;

	        var D1 = b1.dimentions;
	        var D2 = b2.dimentions;

	        var p1=b1.position;
	        var p2=b2.position;
	        var p1x=p1.x;
	        var p1y=p1.y;
	        var p1z=p1.z;
	        var p2x=p2.x;
	        var p2y=p2.y;
	        var p2z=p2.z;
	        // diff
	        var dx=p2x-p1x;
	        var dy=p2y-p1y;
	        var dz=p2z-p1z;
	        // distance
	        var w1=b1.halfWidth;
	        var h1=b1.halfHeight;
	        var d1=b1.halfDepth;
	        var w2=b2.halfWidth;
	        var h2=b2.halfHeight;
	        var d2=b2.halfDepth;
	        // direction

	        // ----------------------------
	        // 15 separating axes
	        // 1~6: face
	        // 7~f: edge
	        // http://marupeke296.com/COL_3D_No13_OBBvsOBB.html
	        // ----------------------------
	        
	        var a1x=D1[0];
	        var a1y=D1[1];
	        var a1z=D1[2];
	        var a2x=D1[3];
	        var a2y=D1[4];
	        var a2z=D1[5];
	        var a3x=D1[6];
	        var a3y=D1[7];
	        var a3z=D1[8];
	        var d1x=D1[9];
	        var d1y=D1[10];
	        var d1z=D1[11];
	        var d2x=D1[12];
	        var d2y=D1[13];
	        var d2z=D1[14];
	        var d3x=D1[15];
	        var d3y=D1[16];
	        var d3z=D1[17];

	        var a4x=D2[0];
	        var a4y=D2[1];
	        var a4z=D2[2];
	        var a5x=D2[3];
	        var a5y=D2[4];
	        var a5z=D2[5];
	        var a6x=D2[6];
	        var a6y=D2[7];
	        var a6z=D2[8];
	        var d4x=D2[9];
	        var d4y=D2[10];
	        var d4z=D2[11];
	        var d5x=D2[12];
	        var d5y=D2[13];
	        var d5z=D2[14];
	        var d6x=D2[15];
	        var d6y=D2[16];
	        var d6z=D2[17];
	        
	        var a7x=a1y*a4z-a1z*a4y;
	        var a7y=a1z*a4x-a1x*a4z;
	        var a7z=a1x*a4y-a1y*a4x;
	        var a8x=a1y*a5z-a1z*a5y;
	        var a8y=a1z*a5x-a1x*a5z;
	        var a8z=a1x*a5y-a1y*a5x;
	        var a9x=a1y*a6z-a1z*a6y;
	        var a9y=a1z*a6x-a1x*a6z;
	        var a9z=a1x*a6y-a1y*a6x;
	        var aax=a2y*a4z-a2z*a4y;
	        var aay=a2z*a4x-a2x*a4z;
	        var aaz=a2x*a4y-a2y*a4x;
	        var abx=a2y*a5z-a2z*a5y;
	        var aby=a2z*a5x-a2x*a5z;
	        var abz=a2x*a5y-a2y*a5x;
	        var acx=a2y*a6z-a2z*a6y;
	        var acy=a2z*a6x-a2x*a6z;
	        var acz=a2x*a6y-a2y*a6x;
	        var adx=a3y*a4z-a3z*a4y;
	        var ady=a3z*a4x-a3x*a4z;
	        var adz=a3x*a4y-a3y*a4x;
	        var aex=a3y*a5z-a3z*a5y;
	        var aey=a3z*a5x-a3x*a5z;
	        var aez=a3x*a5y-a3y*a5x;
	        var afx=a3y*a6z-a3z*a6y;
	        var afy=a3z*a6x-a3x*a6z;
	        var afz=a3x*a6y-a3y*a6x;
	        // right or left flags
	        var right1;
	        var right2;
	        var right3;
	        var right4;
	        var right5;
	        var right6;
	        var right7;
	        var right8;
	        var right9;
	        var righta;
	        var rightb;
	        var rightc;
	        var rightd;
	        var righte;
	        var rightf;
	        // overlapping distances
	        var overlap1;
	        var overlap2;
	        var overlap3;
	        var overlap4;
	        var overlap5;
	        var overlap6;
	        var overlap7;
	        var overlap8;
	        var overlap9;
	        var overlapa;
	        var overlapb;
	        var overlapc;
	        var overlapd;
	        var overlape;
	        var overlapf;
	        // invalid flags
	        var invalid7=false;
	        var invalid8=false;
	        var invalid9=false;
	        var invalida=false;
	        var invalidb=false;
	        var invalidc=false;
	        var invalidd=false;
	        var invalide=false;
	        var invalidf=false;
	        // temporary variables
	        var len;
	        var len1;
	        var len2;
	        var dot1;
	        var dot2;
	        var dot3;
	        // try axis 1
	        len=a1x*dx+a1y*dy+a1z*dz;
	        right1=len>0;
	        if(!right1)len=-len;
	        len1=w1;
	        dot1=a1x*a4x+a1y*a4y+a1z*a4z;
	        dot2=a1x*a5x+a1y*a5y+a1z*a5z;
	        dot3=a1x*a6x+a1y*a6y+a1z*a6z;
	        if(dot1<0)dot1=-dot1;
	        if(dot2<0)dot2=-dot2;
	        if(dot3<0)dot3=-dot3;
	        len2=dot1*w2+dot2*h2+dot3*d2;
	        overlap1=len-len1-len2;
	        if(overlap1>0)return;
	        // try axis 2
	        len=a2x*dx+a2y*dy+a2z*dz;
	        right2=len>0;
	        if(!right2)len=-len;
	        len1=h1;
	        dot1=a2x*a4x+a2y*a4y+a2z*a4z;
	        dot2=a2x*a5x+a2y*a5y+a2z*a5z;
	        dot3=a2x*a6x+a2y*a6y+a2z*a6z;
	        if(dot1<0)dot1=-dot1;
	        if(dot2<0)dot2=-dot2;
	        if(dot3<0)dot3=-dot3;
	        len2=dot1*w2+dot2*h2+dot3*d2;
	        overlap2=len-len1-len2;
	        if(overlap2>0)return;
	        // try axis 3
	        len=a3x*dx+a3y*dy+a3z*dz;
	        right3=len>0;
	        if(!right3)len=-len;
	        len1=d1;
	        dot1=a3x*a4x+a3y*a4y+a3z*a4z;
	        dot2=a3x*a5x+a3y*a5y+a3z*a5z;
	        dot3=a3x*a6x+a3y*a6y+a3z*a6z;
	        if(dot1<0)dot1=-dot1;
	        if(dot2<0)dot2=-dot2;
	        if(dot3<0)dot3=-dot3;
	        len2=dot1*w2+dot2*h2+dot3*d2;
	        overlap3=len-len1-len2;
	        if(overlap3>0)return;
	        // try axis 4
	        len=a4x*dx+a4y*dy+a4z*dz;
	        right4=len>0;
	        if(!right4)len=-len;
	        dot1=a4x*a1x+a4y*a1y+a4z*a1z;
	        dot2=a4x*a2x+a4y*a2y+a4z*a2z;
	        dot3=a4x*a3x+a4y*a3y+a4z*a3z;
	        if(dot1<0)dot1=-dot1;
	        if(dot2<0)dot2=-dot2;
	        if(dot3<0)dot3=-dot3;
	        len1=dot1*w1+dot2*h1+dot3*d1;
	        len2=w2;
	        overlap4=(len-len1-len2)*1.0;
	        if(overlap4>0)return;
	        // try axis 5
	        len=a5x*dx+a5y*dy+a5z*dz;
	        right5=len>0;
	        if(!right5)len=-len;
	        dot1=a5x*a1x+a5y*a1y+a5z*a1z;
	        dot2=a5x*a2x+a5y*a2y+a5z*a2z;
	        dot3=a5x*a3x+a5y*a3y+a5z*a3z;
	        if(dot1<0)dot1=-dot1;
	        if(dot2<0)dot2=-dot2;
	        if(dot3<0)dot3=-dot3;
	        len1=dot1*w1+dot2*h1+dot3*d1;
	        len2=h2;
	        overlap5=(len-len1-len2)*1.0;
	        if(overlap5>0)return;
	        // try axis 6
	        len=a6x*dx+a6y*dy+a6z*dz;
	        right6=len>0;
	        if(!right6)len=-len;
	        dot1=a6x*a1x+a6y*a1y+a6z*a1z;
	        dot2=a6x*a2x+a6y*a2y+a6z*a2z;
	        dot3=a6x*a3x+a6y*a3y+a6z*a3z;
	        if(dot1<0)dot1=-dot1;
	        if(dot2<0)dot2=-dot2;
	        if(dot3<0)dot3=-dot3;
	        len1=dot1*w1+dot2*h1+dot3*d1;
	        len2=d2;
	        overlap6=(len-len1-len2)*1.0;
	        if(overlap6>0)return;
	        // try axis 7
	        len=a7x*a7x+a7y*a7y+a7z*a7z;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            a7x*=len;
	            a7y*=len;
	            a7z*=len;
	            len=a7x*dx+a7y*dy+a7z*dz;
	            right7=len>0;
	            if(!right7)len=-len;
	            dot1=a7x*a2x+a7y*a2y+a7z*a2z;
	            dot2=a7x*a3x+a7y*a3y+a7z*a3z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*h1+dot2*d1;
	            dot1=a7x*a5x+a7y*a5y+a7z*a5z;
	            dot2=a7x*a6x+a7y*a6y+a7z*a6z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*h2+dot2*d2;
	            overlap7=len-len1-len2;
	            if(overlap7>0)return;
	        }else{
	            right7=false;
	            overlap7=0;
	            invalid7=true;
	        }
	        // try axis 8
	        len=a8x*a8x+a8y*a8y+a8z*a8z;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            a8x*=len;
	            a8y*=len;
	            a8z*=len;
	            len=a8x*dx+a8y*dy+a8z*dz;
	            right8=len>0;
	            if(!right8)len=-len;
	            dot1=a8x*a2x+a8y*a2y+a8z*a2z;
	            dot2=a8x*a3x+a8y*a3y+a8z*a3z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*h1+dot2*d1;
	            dot1=a8x*a4x+a8y*a4y+a8z*a4z;
	            dot2=a8x*a6x+a8y*a6y+a8z*a6z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*w2+dot2*d2;
	            overlap8=len-len1-len2;
	            if(overlap8>0)return;
	        }else{
	            right8=false;
	            overlap8=0;
	            invalid8=true;
	        }
	        // try axis 9
	        len=a9x*a9x+a9y*a9y+a9z*a9z;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            a9x*=len;
	            a9y*=len;
	            a9z*=len;
	            len=a9x*dx+a9y*dy+a9z*dz;
	            right9=len>0;
	            if(!right9)len=-len;
	            dot1=a9x*a2x+a9y*a2y+a9z*a2z;
	            dot2=a9x*a3x+a9y*a3y+a9z*a3z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*h1+dot2*d1;
	            dot1=a9x*a4x+a9y*a4y+a9z*a4z;
	            dot2=a9x*a5x+a9y*a5y+a9z*a5z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*w2+dot2*h2;
	            overlap9=len-len1-len2;
	            if(overlap9>0)return;
	        }else{
	            right9=false;
	            overlap9=0;
	            invalid9=true;
	        }
	        // try axis 10
	        len=aax*aax+aay*aay+aaz*aaz;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            aax*=len;
	            aay*=len;
	            aaz*=len;
	            len=aax*dx+aay*dy+aaz*dz;
	            righta=len>0;
	            if(!righta)len=-len;
	            dot1=aax*a1x+aay*a1y+aaz*a1z;
	            dot2=aax*a3x+aay*a3y+aaz*a3z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*w1+dot2*d1;
	            dot1=aax*a5x+aay*a5y+aaz*a5z;
	            dot2=aax*a6x+aay*a6y+aaz*a6z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*h2+dot2*d2;
	            overlapa=len-len1-len2;
	            if(overlapa>0)return;
	        }else{
	            righta=false;
	            overlapa=0;
	            invalida=true;
	        }
	        // try axis 11
	        len=abx*abx+aby*aby+abz*abz;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            abx*=len;
	            aby*=len;
	            abz*=len;
	            len=abx*dx+aby*dy+abz*dz;
	            rightb=len>0;
	            if(!rightb)len=-len;
	            dot1=abx*a1x+aby*a1y+abz*a1z;
	            dot2=abx*a3x+aby*a3y+abz*a3z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*w1+dot2*d1;
	            dot1=abx*a4x+aby*a4y+abz*a4z;
	            dot2=abx*a6x+aby*a6y+abz*a6z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*w2+dot2*d2;
	            overlapb=len-len1-len2;
	            if(overlapb>0)return;
	        }else{
	            rightb=false;
	            overlapb=0;
	            invalidb=true;
	        }
	        // try axis 12
	        len=acx*acx+acy*acy+acz*acz;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            acx*=len;
	            acy*=len;
	            acz*=len;
	            len=acx*dx+acy*dy+acz*dz;
	            rightc=len>0;
	            if(!rightc)len=-len;
	            dot1=acx*a1x+acy*a1y+acz*a1z;
	            dot2=acx*a3x+acy*a3y+acz*a3z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*w1+dot2*d1;
	            dot1=acx*a4x+acy*a4y+acz*a4z;
	            dot2=acx*a5x+acy*a5y+acz*a5z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*w2+dot2*h2;
	            overlapc=len-len1-len2;
	            if(overlapc>0)return;
	        }else{
	            rightc=false;
	            overlapc=0;
	            invalidc=true;
	        }
	        // try axis 13
	        len=adx*adx+ady*ady+adz*adz;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            adx*=len;
	            ady*=len;
	            adz*=len;
	            len=adx*dx+ady*dy+adz*dz;
	            rightd=len>0;
	            if(!rightd)len=-len;
	            dot1=adx*a1x+ady*a1y+adz*a1z;
	            dot2=adx*a2x+ady*a2y+adz*a2z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*w1+dot2*h1;
	            dot1=adx*a5x+ady*a5y+adz*a5z;
	            dot2=adx*a6x+ady*a6y+adz*a6z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*h2+dot2*d2;
	            overlapd=len-len1-len2;
	            if(overlapd>0)return;
	        }else{
	            rightd=false;
	            overlapd=0;
	            invalidd=true;
	        }
	        // try axis 14
	        len=aex*aex+aey*aey+aez*aez;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            aex*=len;
	            aey*=len;
	            aez*=len;
	            len=aex*dx+aey*dy+aez*dz;
	            righte=len>0;
	            if(!righte)len=-len;
	            dot1=aex*a1x+aey*a1y+aez*a1z;
	            dot2=aex*a2x+aey*a2y+aez*a2z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*w1+dot2*h1;
	            dot1=aex*a4x+aey*a4y+aez*a4z;
	            dot2=aex*a6x+aey*a6y+aez*a6z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*w2+dot2*d2;
	            overlape=len-len1-len2;
	            if(overlape>0)return;
	        }else{
	            righte=false;
	            overlape=0;
	            invalide=true;
	        }
	        // try axis 15
	        len=afx*afx+afy*afy+afz*afz;
	        if(len>1e-5){
	            len=1/_Math.sqrt(len);
	            afx*=len;
	            afy*=len;
	            afz*=len;
	            len=afx*dx+afy*dy+afz*dz;
	            rightf=len>0;
	            if(!rightf)len=-len;
	            dot1=afx*a1x+afy*a1y+afz*a1z;
	            dot2=afx*a2x+afy*a2y+afz*a2z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len1=dot1*w1+dot2*h1;
	            dot1=afx*a4x+afy*a4y+afz*a4z;
	            dot2=afx*a5x+afy*a5y+afz*a5z;
	            if(dot1<0)dot1=-dot1;
	            if(dot2<0)dot2=-dot2;
	            len2=dot1*w2+dot2*h2;
	            overlapf=len-len1-len2;
	            if(overlapf>0)return;
	        }else{
	            rightf=false;
	            overlapf=0;
	            invalidf=true;
	        }
	        // boxes are overlapping
	        var depth=overlap1;
	        var depth2=overlap1;
	        var minIndex=0;
	        var right=right1;
	        if(overlap2>depth2){
	            depth=overlap2;
	            depth2=overlap2;
	            minIndex=1;
	            right=right2;
	        }
	        if(overlap3>depth2){
	            depth=overlap3;
	            depth2=overlap3;
	            minIndex=2;
	            right=right3;
	        }
	        if(overlap4>depth2){
	            depth=overlap4;
	            depth2=overlap4;
	            minIndex=3;
	            right=right4;
	        }
	        if(overlap5>depth2){
	            depth=overlap5;
	            depth2=overlap5;
	            minIndex=4;
	            right=right5;
	        }
	        if(overlap6>depth2){
	            depth=overlap6;
	            depth2=overlap6;
	            minIndex=5;
	            right=right6;
	        }
	        if(overlap7-0.01>depth2&&!invalid7){
	            depth=overlap7;
	            depth2=overlap7-0.01;
	            minIndex=6;
	            right=right7;
	        }
	        if(overlap8-0.01>depth2&&!invalid8){
	            depth=overlap8;
	            depth2=overlap8-0.01;
	            minIndex=7;
	            right=right8;
	        }
	        if(overlap9-0.01>depth2&&!invalid9){
	            depth=overlap9;
	            depth2=overlap9-0.01;
	            minIndex=8;
	            right=right9;
	        }
	        if(overlapa-0.01>depth2&&!invalida){
	            depth=overlapa;
	            depth2=overlapa-0.01;
	            minIndex=9;
	            right=righta;
	        }
	        if(overlapb-0.01>depth2&&!invalidb){
	            depth=overlapb;
	            depth2=overlapb-0.01;
	            minIndex=10;
	            right=rightb;
	        }
	        if(overlapc-0.01>depth2&&!invalidc){
	            depth=overlapc;
	            depth2=overlapc-0.01;
	            minIndex=11;
	            right=rightc;
	        }
	        if(overlapd-0.01>depth2&&!invalidd){
	            depth=overlapd;
	            depth2=overlapd-0.01;
	            minIndex=12;
	            right=rightd;
	        }
	        if(overlape-0.01>depth2&&!invalide){
	            depth=overlape;
	            depth2=overlape-0.01;
	            minIndex=13;
	            right=righte;
	        }
	        if(overlapf-0.01>depth2&&!invalidf){
	            depth=overlapf;
	            minIndex=14;
	            right=rightf;
	        }
	        // normal
	        var nx=0;
	        var ny=0;
	        var nz=0;
	        // edge line or face side normal
	        var n1x=0;
	        var n1y=0;
	        var n1z=0;
	        var n2x=0;
	        var n2y=0;
	        var n2z=0;
	        // center of current face
	        var cx=0;
	        var cy=0;
	        var cz=0;
	        // face side
	        var s1x=0;
	        var s1y=0;
	        var s1z=0;
	        var s2x=0;
	        var s2y=0;
	        var s2z=0;
	        // swap b1 b2
	        var swap=false;

	        //_______________________________________

	        if(minIndex==0){// b1.x * b2
	            if(right){
	                cx=p1x+d1x; cy=p1y+d1y;  cz=p1z+d1z;
	                nx=a1x; ny=a1y; nz=a1z;
	            }else{
	                cx=p1x-d1x; cy=p1y-d1y; cz=p1z-d1z;
	                nx=-a1x; ny=-a1y; nz=-a1z;
	            }
	            s1x=d2x; s1y=d2y; s1z=d2z;
	            n1x=-a2x; n1y=-a2y; n1z=-a2z;
	            s2x=d3x; s2y=d3y; s2z=d3z;
	            n2x=-a3x; n2y=-a3y; n2z=-a3z;
	        }
	        else if(minIndex==1){// b1.y * b2
	            if(right){
	                cx=p1x+d2x; cy=p1y+d2y; cz=p1z+d2z;
	                nx=a2x; ny=a2y; nz=a2z;
	            }else{
	                cx=p1x-d2x; cy=p1y-d2y; cz=p1z-d2z;
	                nx=-a2x; ny=-a2y; nz=-a2z;
	            }
	            s1x=d1x; s1y=d1y; s1z=d1z;
	            n1x=-a1x; n1y=-a1y; n1z=-a1z;
	            s2x=d3x; s2y=d3y; s2z=d3z;
	            n2x=-a3x; n2y=-a3y; n2z=-a3z;
	        }
	        else if(minIndex==2){// b1.z * b2
	            if(right){
	                cx=p1x+d3x; cy=p1y+d3y; cz=p1z+d3z;
	                nx=a3x; ny=a3y; nz=a3z;
	            }else{
	                cx=p1x-d3x; cy=p1y-d3y; cz=p1z-d3z;
	                nx=-a3x; ny=-a3y; nz=-a3z;
	            }
	            s1x=d1x; s1y=d1y; s1z=d1z;
	            n1x=-a1x; n1y=-a1y; n1z=-a1z;
	            s2x=d2x; s2y=d2y; s2z=d2z;
	            n2x=-a2x; n2y=-a2y; n2z=-a2z;
	        }
	        else if(minIndex==3){// b2.x * b1
	            swap=true;
	            if(!right){
	                cx=p2x+d4x; cy=p2y+d4y; cz=p2z+d4z;
	                nx=a4x; ny=a4y; nz=a4z;
	            }else{
	                cx=p2x-d4x; cy=p2y-d4y; cz=p2z-d4z;
	                nx=-a4x; ny=-a4y; nz=-a4z;
	            }
	            s1x=d5x; s1y=d5y; s1z=d5z;
	            n1x=-a5x; n1y=-a5y; n1z=-a5z;
	            s2x=d6x; s2y=d6y; s2z=d6z;
	            n2x=-a6x; n2y=-a6y; n2z=-a6z;
	        }
	        else if(minIndex==4){// b2.y * b1
	            swap=true;
	            if(!right){
	                cx=p2x+d5x; cy=p2y+d5y; cz=p2z+d5z;
	                nx=a5x; ny=a5y; nz=a5z;
	            }else{
	                cx=p2x-d5x; cy=p2y-d5y; cz=p2z-d5z;
	                nx=-a5x; ny=-a5y; nz=-a5z;
	            }
	            s1x=d4x; s1y=d4y; s1z=d4z;
	            n1x=-a4x; n1y=-a4y; n1z=-a4z;
	            s2x=d6x; s2y=d6y; s2z=d6z;
	            n2x=-a6x; n2y=-a6y; n2z=-a6z;
	        }
	        else if(minIndex==5){// b2.z * b1
	            swap=true;
	            if(!right){
	                cx=p2x+d6x; cy=p2y+d6y; cz=p2z+d6z;
	                nx=a6x; ny=a6y; nz=a6z;
	            }else{
	                cx=p2x-d6x; cy=p2y-d6y; cz=p2z-d6z;
	                nx=-a6x; ny=-a6y; nz=-a6z;
	            }
	            s1x=d4x; s1y=d4y; s1z=d4z;
	            n1x=-a4x; n1y=-a4y; n1z=-a4z;
	            s2x=d5x; s2y=d5y; s2z=d5z;
	            n2x=-a5x; n2y=-a5y; n2z=-a5z;
	        }
	        else if(minIndex==6){// b1.x * b2.x
	            nx=a7x; ny=a7y; nz=a7z;
	            n1x=a1x; n1y=a1y; n1z=a1z;
	            n2x=a4x; n2y=a4y; n2z=a4z;
	        }
	        else if(minIndex==7){// b1.x * b2.y
	            nx=a8x; ny=a8y; nz=a8z;
	            n1x=a1x; n1y=a1y; n1z=a1z;
	            n2x=a5x; n2y=a5y; n2z=a5z;
	        }
	        else if(minIndex==8){// b1.x * b2.z
	            nx=a9x; ny=a9y; nz=a9z;
	            n1x=a1x; n1y=a1y; n1z=a1z;
	            n2x=a6x; n2y=a6y; n2z=a6z;
	        }
	        else if(minIndex==9){// b1.y * b2.x
	            nx=aax; ny=aay; nz=aaz;
	            n1x=a2x; n1y=a2y; n1z=a2z;
	            n2x=a4x; n2y=a4y; n2z=a4z;
	        }
	        else if(minIndex==10){// b1.y * b2.y
	            nx=abx; ny=aby; nz=abz;
	            n1x=a2x; n1y=a2y; n1z=a2z;
	            n2x=a5x; n2y=a5y; n2z=a5z;
	        }
	        else if(minIndex==11){// b1.y * b2.z
	            nx=acx; ny=acy; nz=acz;
	            n1x=a2x; n1y=a2y; n1z=a2z;
	            n2x=a6x; n2y=a6y; n2z=a6z;
	        }
	        else if(minIndex==12){// b1.z * b2.x
	            nx=adx;  ny=ady; nz=adz;
	            n1x=a3x; n1y=a3y; n1z=a3z;
	            n2x=a4x; n2y=a4y; n2z=a4z;
	        }
	        else if(minIndex==13){// b1.z * b2.y
	            nx=aex; ny=aey; nz=aez;
	            n1x=a3x; n1y=a3y; n1z=a3z;
	            n2x=a5x; n2y=a5y; n2z=a5z;
	        }
	        else if(minIndex==14){// b1.z * b2.z
	            nx=afx; ny=afy; nz=afz;
	            n1x=a3x; n1y=a3y; n1z=a3z;
	            n2x=a6x; n2y=a6y; n2z=a6z;
	        }

	        //__________________________________________

	        //var v;
	        if(minIndex>5){
	            if(!right){
	                nx=-nx; ny=-ny; nz=-nz;
	            }
	            var distance;
	            var maxDistance;
	            var vx;
	            var vy;
	            var vz;
	            var v1x;
	            var v1y;
	            var v1z;
	            var v2x;
	            var v2y;
	            var v2z;
	            //vertex1;
	            v1x=V1[0]; v1y=V1[1]; v1z=V1[2];
	            maxDistance=nx*v1x+ny*v1y+nz*v1z;
	            //vertex2;
	            vx=V1[3]; vy=V1[4]; vz=V1[5];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance>maxDistance){
	                maxDistance=distance;
	                v1x=vx; v1y=vy; v1z=vz;
	            }
	            //vertex3;
	            vx=V1[6]; vy=V1[7]; vz=V1[8];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance>maxDistance){
	                maxDistance=distance;
	                v1x=vx; v1y=vy; v1z=vz;
	            }
	            //vertex4;
	            vx=V1[9]; vy=V1[10]; vz=V1[11];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance>maxDistance){
	                maxDistance=distance;
	                v1x=vx; v1y=vy; v1z=vz;
	            }
	            //vertex5;
	            vx=V1[12]; vy=V1[13]; vz=V1[14];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance>maxDistance){
	                maxDistance=distance;
	                v1x=vx; v1y=vy; v1z=vz;
	            }
	            //vertex6;
	            vx=V1[15]; vy=V1[16]; vz=V1[17];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance>maxDistance){
	                maxDistance=distance;
	                v1x=vx; v1y=vy; v1z=vz;
	            }
	            //vertex7;
	            vx=V1[18]; vy=V1[19]; vz=V1[20];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance>maxDistance){
	                maxDistance=distance;
	                v1x=vx; v1y=vy; v1z=vz;
	            }
	            //vertex8;
	            vx=V1[21]; vy=V1[22]; vz=V1[23];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance>maxDistance){
	                maxDistance=distance;
	                v1x=vx; v1y=vy; v1z=vz;
	            }
	            //vertex1;
	            v2x=V2[0]; v2y=V2[1]; v2z=V2[2];
	            maxDistance=nx*v2x+ny*v2y+nz*v2z;
	            //vertex2;
	            vx=V2[3]; vy=V2[4]; vz=V2[5];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance<maxDistance){
	                maxDistance=distance;
	                v2x=vx; v2y=vy; v2z=vz;
	            }
	            //vertex3;
	            vx=V2[6]; vy=V2[7]; vz=V2[8];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance<maxDistance){
	                maxDistance=distance;
	                v2x=vx; v2y=vy; v2z=vz;
	            }
	            //vertex4;
	            vx=V2[9]; vy=V2[10]; vz=V2[11];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance<maxDistance){
	                maxDistance=distance;
	                v2x=vx; v2y=vy; v2z=vz;
	            }
	            //vertex5;
	            vx=V2[12]; vy=V2[13]; vz=V2[14];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance<maxDistance){
	                maxDistance=distance;
	                v2x=vx; v2y=vy; v2z=vz;
	            }
	            //vertex6;
	            vx=V2[15]; vy=V2[16]; vz=V2[17];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance<maxDistance){
	                maxDistance=distance;
	                v2x=vx; v2y=vy; v2z=vz;
	            }
	            //vertex7;
	            vx=V2[18]; vy=V2[19]; vz=V2[20];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance<maxDistance){
	                maxDistance=distance;
	                v2x=vx; v2y=vy; v2z=vz;
	            }
	            //vertex8;
	            vx=V2[21]; vy=V2[22]; vz=V2[23];
	            distance=nx*vx+ny*vy+nz*vz;
	            if(distance<maxDistance){
	                maxDistance=distance;
	                v2x=vx; v2y=vy; v2z=vz;
	            }
	            vx=v2x-v1x; vy=v2y-v1y; vz=v2z-v1z;
	            dot1=n1x*n2x+n1y*n2y+n1z*n2z;
	            var t=(vx*(n1x-n2x*dot1)+vy*(n1y-n2y*dot1)+vz*(n1z-n2z*dot1))/(1-dot1*dot1);
	            manifold.addPoint(v1x+n1x*t+nx*depth*0.5,v1y+n1y*t+ny*depth*0.5,v1z+n1z*t+nz*depth*0.5,nx,ny,nz,depth,false);
	            return;
	        }
	        // now detect face-face collision...
	        // target quad
	        var q1x;
	        var q1y;
	        var q1z;
	        var q2x;
	        var q2y;
	        var q2z;
	        var q3x;
	        var q3y;
	        var q3z;
	        var q4x;
	        var q4y;
	        var q4z;
	        // search support face and vertex
	        var minDot=1;
	        var dot=0;
	        var minDotIndex=0;
	        if(swap){
	            dot=a1x*nx+a1y*ny+a1z*nz;
	            if(dot<minDot){
	                minDot=dot;
	                minDotIndex=0;
	            }
	            if(-dot<minDot){
	                minDot=-dot;
	                minDotIndex=1;
	            }
	            dot=a2x*nx+a2y*ny+a2z*nz;
	            if(dot<minDot){
	                minDot=dot;
	                minDotIndex=2;
	            }
	            if(-dot<minDot){
	                minDot=-dot;
	                minDotIndex=3;
	            }
	            dot=a3x*nx+a3y*ny+a3z*nz;
	            if(dot<minDot){
	                minDot=dot;
	                minDotIndex=4;
	            }
	            if(-dot<minDot){
	                minDot=-dot;
	                minDotIndex=5;
	            }

	            if(minDotIndex==0){// x+ face
	                q1x=V1[0]; q1y=V1[1]; q1z=V1[2];//vertex1
	                q2x=V1[6]; q2y=V1[7]; q2z=V1[8];//vertex3
	                q3x=V1[9]; q3y=V1[10]; q3z=V1[11];//vertex4
	                q4x=V1[3]; q4y=V1[4]; q4z=V1[5];//vertex2
	            }
	            else if(minDotIndex==1){// x- face
	                q1x=V1[15]; q1y=V1[16]; q1z=V1[17];//vertex6
	                q2x=V1[21]; q2y=V1[22]; q2z=V1[23];//vertex8
	                q3x=V1[18]; q3y=V1[19]; q3z=V1[20];//vertex7
	                q4x=V1[12]; q4y=V1[13]; q4z=V1[14];//vertex5
	            }
	            else if(minDotIndex==2){// y+ face
	                q1x=V1[12]; q1y=V1[13]; q1z=V1[14];//vertex5
	                q2x=V1[0]; q2y=V1[1]; q2z=V1[2];//vertex1
	                q3x=V1[3]; q3y=V1[4]; q3z=V1[5];//vertex2
	                q4x=V1[15]; q4y=V1[16]; q4z=V1[17];//vertex6
	            }
	            else if(minDotIndex==3){// y- face
	                q1x=V1[21]; q1y=V1[22]; q1z=V1[23];//vertex8
	                q2x=V1[9]; q2y=V1[10]; q2z=V1[11];//vertex4
	                q3x=V1[6]; q3y=V1[7]; q3z=V1[8];//vertex3
	                q4x=V1[18]; q4y=V1[19]; q4z=V1[20];//vertex7
	            }
	            else if(minDotIndex==4){// z+ face
	                q1x=V1[12]; q1y=V1[13]; q1z=V1[14];//vertex5
	                q2x=V1[18]; q2y=V1[19]; q2z=V1[20];//vertex7
	                q3x=V1[6]; q3y=V1[7]; q3z=V1[8];//vertex3
	                q4x=V1[0]; q4y=V1[1]; q4z=V1[2];//vertex1
	            }
	            else if(minDotIndex==5){// z- face
	                q1x=V1[3]; q1y=V1[4]; q1z=V1[5];//vertex2
	                //2x=V1[6]; q2y=V1[7]; q2z=V1[8];//vertex4 !!!
	                q2x=V2[9]; q2y=V2[10]; q2z=V2[11];//vertex4
	                q3x=V1[21]; q3y=V1[22]; q3z=V1[23];//vertex8
	                q4x=V1[15]; q4y=V1[16]; q4z=V1[17];//vertex6
	            }

	        }else{
	            dot=a4x*nx+a4y*ny+a4z*nz;
	            if(dot<minDot){
	                minDot=dot;
	                minDotIndex=0;
	            }
	            if(-dot<minDot){
	                minDot=-dot;
	                minDotIndex=1;
	            }
	            dot=a5x*nx+a5y*ny+a5z*nz;
	            if(dot<minDot){
	                minDot=dot;
	                minDotIndex=2;
	            }
	            if(-dot<minDot){
	                minDot=-dot;
	                minDotIndex=3;
	            }
	            dot=a6x*nx+a6y*ny+a6z*nz;
	            if(dot<minDot){
	                minDot=dot;
	                minDotIndex=4;
	            }
	            if(-dot<minDot){
	                minDot=-dot;
	                minDotIndex=5;
	            }

	            //______________________________________________________

	            if(minDotIndex==0){// x+ face
	                q1x=V2[0]; q1y=V2[1]; q1z=V2[2];//vertex1
	                q2x=V2[6]; q2y=V2[7]; q2z=V2[8];//vertex3
	                q3x=V2[9]; q3y=V2[10]; q3z=V2[11];//vertex4
	                q4x=V2[3]; q4y=V2[4]; q4z=V2[5];//vertex2
	            }
	            else if(minDotIndex==1){// x- face
	                q1x=V2[15]; q1y=V2[16]; q1z=V2[17];//vertex6
	                q2x=V2[21]; q2y=V2[22]; q2z=V2[23]; //vertex8
	                q3x=V2[18]; q3y=V2[19]; q3z=V2[20];//vertex7
	                q4x=V2[12]; q4y=V2[13]; q4z=V2[14];//vertex5
	            }
	            else if(minDotIndex==2){// y+ face
	                q1x=V2[12]; q1y=V2[13]; q1z=V2[14];//vertex5
	                q2x=V2[0]; q2y=V2[1]; q2z=V2[2];//vertex1
	                q3x=V2[3]; q3y=V2[4]; q3z=V2[5];//vertex2
	                q4x=V2[15]; q4y=V2[16]; q4z=V2[17];//vertex6
	            }
	            else if(minDotIndex==3){// y- face
	                q1x=V2[21]; q1y=V2[22]; q1z=V2[23];//vertex8
	                q2x=V2[9]; q2y=V2[10]; q2z=V2[11];//vertex4
	                q3x=V2[6]; q3y=V2[7]; q3z=V2[8];//vertex3
	                q4x=V2[18]; q4y=V2[19]; q4z=V2[20];//vertex7
	            }
	            else if(minDotIndex==4){// z+ face
	                q1x=V2[12]; q1y=V2[13]; q1z=V2[14];//vertex5
	                q2x=V2[18]; q2y=V2[19]; q2z=V2[20];//vertex7
	                q3x=V2[6]; q3y=V2[7]; q3z=V2[8];//vertex3
	                q4x=V2[0]; q4y=V2[1]; q4z=V2[2];//vertex1
	            }
	            else if(minDotIndex==5){// z- face
	                q1x=V2[3]; q1y=V2[4]; q1z=V2[5];//vertex2
	                q2x=V2[9]; q2y=V2[10]; q2z=V2[11];//vertex4
	                q3x=V2[21]; q3y=V2[22]; q3z=V2[23];//vertex8
	                q4x=V2[15]; q4y=V2[16]; q4z=V2[17];//vertex6
	            }
	      
	        }
	        // clip vertices
	        var numClipVertices;
	        var numAddedClipVertices;
	        var index;
	        var x1;
	        var y1;
	        var z1;
	        var x2;
	        var y2;
	        var z2;
	        this.clipVertices1[0]=q1x;
	        this.clipVertices1[1]=q1y;
	        this.clipVertices1[2]=q1z;
	        this.clipVertices1[3]=q2x;
	        this.clipVertices1[4]=q2y;
	        this.clipVertices1[5]=q2z;
	        this.clipVertices1[6]=q3x;
	        this.clipVertices1[7]=q3y;
	        this.clipVertices1[8]=q3z;
	        this.clipVertices1[9]=q4x;
	        this.clipVertices1[10]=q4y;
	        this.clipVertices1[11]=q4z;
	        numAddedClipVertices=0;
	        x1=this.clipVertices1[9];
	        y1=this.clipVertices1[10];
	        z1=this.clipVertices1[11];
	        dot1=(x1-cx-s1x)*n1x+(y1-cy-s1y)*n1y+(z1-cz-s1z)*n1z;

	        //var i = 4;
	        //while(i--){
	        for(var i=0;i<4;i++){
	            index=i*3;
	            x2=this.clipVertices1[index];
	            y2=this.clipVertices1[index+1];
	            z2=this.clipVertices1[index+2];
	            dot2=(x2-cx-s1x)*n1x+(y2-cy-s1y)*n1y+(z2-cz-s1z)*n1z;
	            if(dot1>0){
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices2[index]=x2;
	                    this.clipVertices2[index+1]=y2;
	                    this.clipVertices2[index+2]=z2;
	                }else{
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices2[index]=x1+(x2-x1)*t;
	                    this.clipVertices2[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices2[index+2]=z1+(z2-z1)*t;
	                }
	            }else{
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices2[index]=x1+(x2-x1)*t;
	                    this.clipVertices2[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices2[index+2]=z1+(z2-z1)*t;
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices2[index]=x2;
	                    this.clipVertices2[index+1]=y2;
	                    this.clipVertices2[index+2]=z2;
	                }
	            }
	            x1=x2;
	            y1=y2;
	            z1=z2;
	            dot1=dot2;
	        }

	        numClipVertices=numAddedClipVertices;
	        if(numClipVertices==0)return;
	        numAddedClipVertices=0;
	        index=(numClipVertices-1)*3;
	        x1=this.clipVertices2[index];
	        y1=this.clipVertices2[index+1];
	        z1=this.clipVertices2[index+2];
	        dot1=(x1-cx-s2x)*n2x+(y1-cy-s2y)*n2y+(z1-cz-s2z)*n2z;

	        //i = numClipVertices;
	        //while(i--){
	        for(i=0;i<numClipVertices;i++){
	            index=i*3;
	            x2=this.clipVertices2[index];
	            y2=this.clipVertices2[index+1];
	            z2=this.clipVertices2[index+2];
	            dot2=(x2-cx-s2x)*n2x+(y2-cy-s2y)*n2y+(z2-cz-s2z)*n2z;
	            if(dot1>0){
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices1[index]=x2;
	                    this.clipVertices1[index+1]=y2;
	                    this.clipVertices1[index+2]=z2;
	                }else{
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices1[index]=x1+(x2-x1)*t;
	                    this.clipVertices1[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices1[index+2]=z1+(z2-z1)*t;
	                }
	            }else{
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices1[index]=x1+(x2-x1)*t;
	                    this.clipVertices1[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices1[index+2]=z1+(z2-z1)*t;
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices1[index]=x2;
	                    this.clipVertices1[index+1]=y2;
	                    this.clipVertices1[index+2]=z2;
	                }
	            }
	            x1=x2;
	            y1=y2;
	            z1=z2;
	            dot1=dot2;
	        }

	        numClipVertices=numAddedClipVertices;
	        if(numClipVertices==0)return;
	        numAddedClipVertices=0;
	        index=(numClipVertices-1)*3;
	        x1=this.clipVertices1[index];
	        y1=this.clipVertices1[index+1];
	        z1=this.clipVertices1[index+2];
	        dot1=(x1-cx+s1x)*-n1x+(y1-cy+s1y)*-n1y+(z1-cz+s1z)*-n1z;

	        //i = numClipVertices;
	        //while(i--){
	        for(i=0;i<numClipVertices;i++){
	            index=i*3;
	            x2=this.clipVertices1[index];
	            y2=this.clipVertices1[index+1];
	            z2=this.clipVertices1[index+2];
	            dot2=(x2-cx+s1x)*-n1x+(y2-cy+s1y)*-n1y+(z2-cz+s1z)*-n1z;
	            if(dot1>0){
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices2[index]=x2;
	                    this.clipVertices2[index+1]=y2;
	                    this.clipVertices2[index+2]=z2;
	                }else{
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices2[index]=x1+(x2-x1)*t;
	                    this.clipVertices2[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices2[index+2]=z1+(z2-z1)*t;
	                }
	            }else{
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices2[index]=x1+(x2-x1)*t;
	                    this.clipVertices2[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices2[index+2]=z1+(z2-z1)*t;
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices2[index]=x2;
	                    this.clipVertices2[index+1]=y2;
	                    this.clipVertices2[index+2]=z2;
	                }
	            }
	            x1=x2;
	            y1=y2;
	            z1=z2;
	            dot1=dot2;
	        }

	        numClipVertices=numAddedClipVertices;
	        if(numClipVertices==0)return;
	        numAddedClipVertices=0;
	        index=(numClipVertices-1)*3;
	        x1=this.clipVertices2[index];
	        y1=this.clipVertices2[index+1];
	        z1=this.clipVertices2[index+2];
	        dot1=(x1-cx+s2x)*-n2x+(y1-cy+s2y)*-n2y+(z1-cz+s2z)*-n2z;

	        //i = numClipVertices;
	        //while(i--){
	        for(i=0;i<numClipVertices;i++){
	            index=i*3;
	            x2=this.clipVertices2[index];
	            y2=this.clipVertices2[index+1];
	            z2=this.clipVertices2[index+2];
	            dot2=(x2-cx+s2x)*-n2x+(y2-cy+s2y)*-n2y+(z2-cz+s2z)*-n2z;
	            if(dot1>0){
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices1[index]=x2;
	                    this.clipVertices1[index+1]=y2;
	                    this.clipVertices1[index+2]=z2;
	                }else{
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices1[index]=x1+(x2-x1)*t;
	                    this.clipVertices1[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices1[index+2]=z1+(z2-z1)*t;
	                }
	            }else{
	                if(dot2>0){
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    t=dot1/(dot1-dot2);
	                    this.clipVertices1[index]=x1+(x2-x1)*t;
	                    this.clipVertices1[index+1]=y1+(y2-y1)*t;
	                    this.clipVertices1[index+2]=z1+(z2-z1)*t;
	                    index=numAddedClipVertices*3;
	                    numAddedClipVertices++;
	                    this.clipVertices1[index]=x2;
	                    this.clipVertices1[index+1]=y2;
	                    this.clipVertices1[index+2]=z2;
	                }
	            }
	            x1=x2;
	            y1=y2;
	            z1=z2;
	            dot1=dot2;
	        }

	        numClipVertices=numAddedClipVertices;
	        if(swap){
	            var tb=b1;
	            b1=b2;
	            b2=tb;
	        }
	        if(numClipVertices==0)return;
	        var flipped=b1!=shape1;
	        if(numClipVertices>4){
	            x1=(q1x+q2x+q3x+q4x)*0.25;
	            y1=(q1y+q2y+q3y+q4y)*0.25;
	            z1=(q1z+q2z+q3z+q4z)*0.25;
	            n1x=q1x-x1;
	            n1y=q1y-y1;
	            n1z=q1z-z1;
	            n2x=q2x-x1;
	            n2y=q2y-y1;
	            n2z=q2z-z1;
	            var index1=0;
	            var index2=0;
	            var index3=0;
	            var index4=0;
	            var maxDot=-this.INF;
	            minDot=this.INF;

	            //i = numClipVertices;
	            //while(i--){
	            for(i=0;i<numClipVertices;i++){
	                this.used[i]=false;
	                index=i*3;
	                x1=this.clipVertices1[index];
	                y1=this.clipVertices1[index+1];
	                z1=this.clipVertices1[index+2];
	                dot=x1*n1x+y1*n1y+z1*n1z;
	                if(dot<minDot){
	                    minDot=dot;
	                    index1=i;
	                }
	                if(dot>maxDot){
	                    maxDot=dot;
	                    index3=i;
	                }
	            }

	            this.used[index1]=true;
	            this.used[index3]=true;
	            maxDot=-this.INF;
	            minDot=this.INF;

	            //i = numClipVertices;
	            //while(i--){
	            for(i=0;i<numClipVertices;i++){
	                if(this.used[i])continue;
	                index=i*3;
	                x1=this.clipVertices1[index];
	                y1=this.clipVertices1[index+1];
	                z1=this.clipVertices1[index+2];
	                dot=x1*n2x+y1*n2y+z1*n2z;
	                if(dot<minDot){
	                    minDot=dot;
	                    index2=i;
	                }
	                if(dot>maxDot){
	                    maxDot=dot;
	                    index4=i;
	                }
	            }

	            index=index1*3;
	            x1=this.clipVertices1[index];
	            y1=this.clipVertices1[index+1];
	            z1=this.clipVertices1[index+2];
	            dot=(x1-cx)*nx+(y1-cy)*ny+(z1-cz)*nz;
	            if(dot<0) manifold.addPoint(x1,y1,z1,nx,ny,nz,dot,flipped);
	            
	            index=index2*3;
	            x1=this.clipVertices1[index];
	            y1=this.clipVertices1[index+1];
	            z1=this.clipVertices1[index+2];
	            dot=(x1-cx)*nx+(y1-cy)*ny+(z1-cz)*nz;
	            if(dot<0) manifold.addPoint(x1,y1,z1,nx,ny,nz,dot,flipped);
	            
	            index=index3*3;
	            x1=this.clipVertices1[index];
	            y1=this.clipVertices1[index+1];
	            z1=this.clipVertices1[index+2];
	            dot=(x1-cx)*nx+(y1-cy)*ny+(z1-cz)*nz;
	            if(dot<0) manifold.addPoint(x1,y1,z1,nx,ny,nz,dot,flipped);
	            
	            index=index4*3;
	            x1=this.clipVertices1[index];
	            y1=this.clipVertices1[index+1];
	            z1=this.clipVertices1[index+2];
	            dot=(x1-cx)*nx+(y1-cy)*ny+(z1-cz)*nz;
	            if(dot<0) manifold.addPoint(x1,y1,z1,nx,ny,nz,dot,flipped);
	            
	        }else{
	            //i = numClipVertices;
	            //while(i--){
	            for(i=0;i<numClipVertices;i++){
	                index=i*3;
	                x1=this.clipVertices1[index];
	                y1=this.clipVertices1[index+1];
	                z1=this.clipVertices1[index+2];
	                dot=(x1-cx)*nx+(y1-cy)*ny+(z1-cz)*nz;
	                if(dot<0)manifold.addPoint(x1,y1,z1,nx,ny,nz,dot,flipped);
	            }
	        }

	    }

	});

	function BoxCylinderCollisionDetector (flip){

	    CollisionDetector.call( this );
	    this.flip = flip;

	}

	BoxCylinderCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: BoxCylinderCollisionDetector,

	    getSep: function ( c1, c2, sep, pos, dep ) {

	        var t1x;
	        var t1y;
	        var t1z;
	        var t2x;
	        var t2y;
	        var t2z;
	        var sup=new Vec3();
	        var len;
	        var p1x;
	        var p1y;
	        var p1z;
	        var p2x;
	        var p2y;
	        var p2z;
	        var v01x=c1.position.x;
	        var v01y=c1.position.y;
	        var v01z=c1.position.z;
	        var v02x=c2.position.x;
	        var v02y=c2.position.y;
	        var v02z=c2.position.z;
	        var v0x=v02x-v01x;
	        var v0y=v02y-v01y;
	        var v0z=v02z-v01z;
	        if(v0x*v0x+v0y*v0y+v0z*v0z==0)v0y=0.001;
	        var nx=-v0x;
	        var ny=-v0y;
	        var nz=-v0z;
	        this.supportPointB(c1,-nx,-ny,-nz,sup);
	        var v11x=sup.x;
	        var v11y=sup.y;
	        var v11z=sup.z;
	        this.supportPointC(c2,nx,ny,nz,sup);
	        var v12x=sup.x;
	        var v12y=sup.y;
	        var v12z=sup.z;
	        var v1x=v12x-v11x;
	        var v1y=v12y-v11y;
	        var v1z=v12z-v11z;
	        if(v1x*nx+v1y*ny+v1z*nz<=0){
	        return false;
	        }
	        nx=v1y*v0z-v1z*v0y;
	        ny=v1z*v0x-v1x*v0z;
	        nz=v1x*v0y-v1y*v0x;
	        if(nx*nx+ny*ny+nz*nz==0){
	        sep.set( v1x-v0x, v1y-v0y, v1z-v0z ).normalize();
	        pos.set( (v11x+v12x)*0.5, (v11y+v12y)*0.5, (v11z+v12z)*0.5 );
	        return true;
	        }
	        this.supportPointB(c1,-nx,-ny,-nz,sup);
	        var v21x=sup.x;
	        var v21y=sup.y;
	        var v21z=sup.z;
	        this.supportPointC(c2,nx,ny,nz,sup);
	        var v22x=sup.x;
	        var v22y=sup.y;
	        var v22z=sup.z;
	        var v2x=v22x-v21x;
	        var v2y=v22y-v21y;
	        var v2z=v22z-v21z;
	        if(v2x*nx+v2y*ny+v2z*nz<=0){
	        return false;
	        }
	        t1x=v1x-v0x;
	        t1y=v1y-v0y;
	        t1z=v1z-v0z;
	        t2x=v2x-v0x;
	        t2y=v2y-v0y;
	        t2z=v2z-v0z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        if(nx*v0x+ny*v0y+nz*v0z>0){
	        t1x=v1x;
	        t1y=v1y;
	        t1z=v1z;
	        v1x=v2x;
	        v1y=v2y;
	        v1z=v2z;
	        v2x=t1x;
	        v2y=t1y;
	        v2z=t1z;
	        t1x=v11x;
	        t1y=v11y;
	        t1z=v11z;
	        v11x=v21x;
	        v11y=v21y;
	        v11z=v21z;
	        v21x=t1x;
	        v21y=t1y;
	        v21z=t1z;
	        t1x=v12x;
	        t1y=v12y;
	        t1z=v12z;
	        v12x=v22x;
	        v12y=v22y;
	        v12z=v22z;
	        v22x=t1x;
	        v22y=t1y;
	        v22z=t1z;
	        nx=-nx;
	        ny=-ny;
	        nz=-nz;
	        }
	        var iterations=0;
	        while(true){
	        if(++iterations>100){
	        return false;
	        }
	        this.supportPointB(c1,-nx,-ny,-nz,sup);
	        var v31x=sup.x;
	        var v31y=sup.y;
	        var v31z=sup.z;
	        this.supportPointC(c2,nx,ny,nz,sup);
	        var v32x=sup.x;
	        var v32y=sup.y;
	        var v32z=sup.z;
	        var v3x=v32x-v31x;
	        var v3y=v32y-v31y;
	        var v3z=v32z-v31z;
	        if(v3x*nx+v3y*ny+v3z*nz<=0){
	        return false;
	        }
	        if((v1y*v3z-v1z*v3y)*v0x+(v1z*v3x-v1x*v3z)*v0y+(v1x*v3y-v1y*v3x)*v0z<0){
	        v2x=v3x;
	        v2y=v3y;
	        v2z=v3z;
	        v21x=v31x;
	        v21y=v31y;
	        v21z=v31z;
	        v22x=v32x;
	        v22y=v32y;
	        v22z=v32z;
	        t1x=v1x-v0x;
	        t1y=v1y-v0y;
	        t1z=v1z-v0z;
	        t2x=v3x-v0x;
	        t2y=v3y-v0y;
	        t2z=v3z-v0z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        continue;
	        }
	        if((v3y*v2z-v3z*v2y)*v0x+(v3z*v2x-v3x*v2z)*v0y+(v3x*v2y-v3y*v2x)*v0z<0){
	        v1x=v3x;
	        v1y=v3y;
	        v1z=v3z;
	        v11x=v31x;
	        v11y=v31y;
	        v11z=v31z;
	        v12x=v32x;
	        v12y=v32y;
	        v12z=v32z;
	        t1x=v3x-v0x;
	        t1y=v3y-v0y;
	        t1z=v3z-v0z;
	        t2x=v2x-v0x;
	        t2y=v2y-v0y;
	        t2z=v2z-v0z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        continue;
	        }
	        var hit=false;
	        while(true){
	        t1x=v2x-v1x;
	        t1y=v2y-v1y;
	        t1z=v2z-v1z;
	        t2x=v3x-v1x;
	        t2y=v3y-v1y;
	        t2z=v3z-v1z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        len=1/_Math.sqrt(nx*nx+ny*ny+nz*nz);
	        nx*=len;
	        ny*=len;
	        nz*=len;
	        if(nx*v1x+ny*v1y+nz*v1z>=0&&!hit){
	        var b0=(v1y*v2z-v1z*v2y)*v3x+(v1z*v2x-v1x*v2z)*v3y+(v1x*v2y-v1y*v2x)*v3z;
	        var b1=(v3y*v2z-v3z*v2y)*v0x+(v3z*v2x-v3x*v2z)*v0y+(v3x*v2y-v3y*v2x)*v0z;
	        var b2=(v0y*v1z-v0z*v1y)*v3x+(v0z*v1x-v0x*v1z)*v3y+(v0x*v1y-v0y*v1x)*v3z;
	        var b3=(v2y*v1z-v2z*v1y)*v0x+(v2z*v1x-v2x*v1z)*v0y+(v2x*v1y-v2y*v1x)*v0z;
	        var sum=b0+b1+b2+b3;
	        if(sum<=0){
	        b0=0;
	        b1=(v2y*v3z-v2z*v3y)*nx+(v2z*v3x-v2x*v3z)*ny+(v2x*v3y-v2y*v3x)*nz;
	        b2=(v3y*v2z-v3z*v2y)*nx+(v3z*v2x-v3x*v2z)*ny+(v3x*v2y-v3y*v2x)*nz;
	        b3=(v1y*v2z-v1z*v2y)*nx+(v1z*v2x-v1x*v2z)*ny+(v1x*v2y-v1y*v2x)*nz;
	        sum=b1+b2+b3;
	        }
	        var inv=1/sum;
	        p1x=(v01x*b0+v11x*b1+v21x*b2+v31x*b3)*inv;
	        p1y=(v01y*b0+v11y*b1+v21y*b2+v31y*b3)*inv;
	        p1z=(v01z*b0+v11z*b1+v21z*b2+v31z*b3)*inv;
	        p2x=(v02x*b0+v12x*b1+v22x*b2+v32x*b3)*inv;
	        p2y=(v02y*b0+v12y*b1+v22y*b2+v32y*b3)*inv;
	        p2z=(v02z*b0+v12z*b1+v22z*b2+v32z*b3)*inv;
	        hit=true;
	        }
	        this.supportPointB(c1,-nx,-ny,-nz,sup);
	        var v41x=sup.x;
	        var v41y=sup.y;
	        var v41z=sup.z;
	        this.supportPointC(c2,nx,ny,nz,sup);
	        var v42x=sup.x;
	        var v42y=sup.y;
	        var v42z=sup.z;
	        var v4x=v42x-v41x;
	        var v4y=v42y-v41y;
	        var v4z=v42z-v41z;
	        var separation=-(v4x*nx+v4y*ny+v4z*nz);
	        if((v4x-v3x)*nx+(v4y-v3y)*ny+(v4z-v3z)*nz<=0.01||separation>=0){
	        if(hit){
	        sep.set( -nx, -ny, -nz );
	        pos.set( (p1x+p2x)*0.5, (p1y+p2y)*0.5, (p1z+p2z)*0.5 );
	        dep.x=separation;
	        return true;
	        }
	        return false;
	        }
	        if(
	        (v4y*v1z-v4z*v1y)*v0x+
	        (v4z*v1x-v4x*v1z)*v0y+
	        (v4x*v1y-v4y*v1x)*v0z<0
	        ){
	        if(
	        (v4y*v2z-v4z*v2y)*v0x+
	        (v4z*v2x-v4x*v2z)*v0y+
	        (v4x*v2y-v4y*v2x)*v0z<0
	        ){
	        v1x=v4x;
	        v1y=v4y;
	        v1z=v4z;
	        v11x=v41x;
	        v11y=v41y;
	        v11z=v41z;
	        v12x=v42x;
	        v12y=v42y;
	        v12z=v42z;
	        }else{
	        v3x=v4x;
	        v3y=v4y;
	        v3z=v4z;
	        v31x=v41x;
	        v31y=v41y;
	        v31z=v41z;
	        v32x=v42x;
	        v32y=v42y;
	        v32z=v42z;
	        }
	        }else{
	        if(
	        (v4y*v3z-v4z*v3y)*v0x+
	        (v4z*v3x-v4x*v3z)*v0y+
	        (v4x*v3y-v4y*v3x)*v0z<0
	        ){
	        v2x=v4x;
	        v2y=v4y;
	        v2z=v4z;
	        v21x=v41x;
	        v21y=v41y;
	        v21z=v41z;
	        v22x=v42x;
	        v22y=v42y;
	        v22z=v42z;
	        }else{
	        v1x=v4x;
	        v1y=v4y;
	        v1z=v4z;
	        v11x=v41x;
	        v11y=v41y;
	        v11z=v41z;
	        v12x=v42x;
	        v12y=v42y;
	        v12z=v42z;
	    }
	    }
	    }
	    }
	    //return false;
	    },

	    supportPointB: function( c, dx, dy, dz, out ) {

	        var rot=c.rotation.elements;
	        var ldx=rot[0]*dx+rot[3]*dy+rot[6]*dz;
	        var ldy=rot[1]*dx+rot[4]*dy+rot[7]*dz;
	        var ldz=rot[2]*dx+rot[5]*dy+rot[8]*dz;
	        var w=c.halfWidth;
	        var h=c.halfHeight;
	        var d=c.halfDepth;
	        var ox;
	        var oy;
	        var oz;
	        if(ldx<0)ox=-w;
	        else ox=w;
	        if(ldy<0)oy=-h;
	        else oy=h;
	        if(ldz<0)oz=-d;
	        else oz=d;
	        ldx=rot[0]*ox+rot[1]*oy+rot[2]*oz+c.position.x;
	        ldy=rot[3]*ox+rot[4]*oy+rot[5]*oz+c.position.y;
	        ldz=rot[6]*ox+rot[7]*oy+rot[8]*oz+c.position.z;
	        out.set( ldx, ldy, ldz );

	    },

	    supportPointC: function ( c, dx, dy, dz, out ) {

	        var rot=c.rotation.elements;
	        var ldx=rot[0]*dx+rot[3]*dy+rot[6]*dz;
	        var ldy=rot[1]*dx+rot[4]*dy+rot[7]*dz;
	        var ldz=rot[2]*dx+rot[5]*dy+rot[8]*dz;
	        var radx=ldx;
	        var radz=ldz;
	        var len=radx*radx+radz*radz;
	        var rad=c.radius;
	        var hh=c.halfHeight;
	        var ox;
	        var oy;
	        var oz;
	        if(len==0){
	        if(ldy<0){
	        ox=rad;
	        oy=-hh;
	        oz=0;
	        }else{
	        ox=rad;
	        oy=hh;
	        oz=0;
	        }
	        }else{
	        len=c.radius/_Math.sqrt(len);
	        if(ldy<0){
	        ox=radx*len;
	        oy=-hh;
	        oz=radz*len;
	        }else{
	        ox=radx*len;
	        oy=hh;
	        oz=radz*len;
	        }
	        }
	        ldx=rot[0]*ox+rot[1]*oy+rot[2]*oz+c.position.x;
	        ldy=rot[3]*ox+rot[4]*oy+rot[5]*oz+c.position.y;
	        ldz=rot[6]*ox+rot[7]*oy+rot[8]*oz+c.position.z;
	        out.set( ldx, ldy, ldz );

	    },

	    detectCollision: function( shape1, shape2, manifold ) {

	        var b;
	        var c;
	        if(this.flip){
	        b=shape2;
	        c=shape1;
	        }else{
	        b=shape1;
	        c=shape2;
	        }
	        var sep=new Vec3();
	        var pos=new Vec3();
	        var dep=new Vec3();

	        if(!this.getSep(b,c,sep,pos,dep))return;
	        var pbx=b.position.x;
	        var pby=b.position.y;
	        var pbz=b.position.z;
	        var pcx=c.position.x;
	        var pcy=c.position.y;
	        var pcz=c.position.z;
	        var bw=b.halfWidth;
	        var bh=b.halfHeight;
	        var bd=b.halfDepth;
	        var ch=c.halfHeight;
	        var r=c.radius;

	        var D = b.dimentions;

	        var nwx=D[0];//b.normalDirectionWidth.x;
	        var nwy=D[1];//b.normalDirectionWidth.y;
	        var nwz=D[2];//b.normalDirectionWidth.z;
	        var nhx=D[3];//b.normalDirectionHeight.x;
	        var nhy=D[4];//b.normalDirectionHeight.y;
	        var nhz=D[5];//b.normalDirectionHeight.z;
	        var ndx=D[6];//b.normalDirectionDepth.x;
	        var ndy=D[7];//b.normalDirectionDepth.y;
	        var ndz=D[8];//b.normalDirectionDepth.z;

	        var dwx=D[9];//b.halfDirectionWidth.x;
	        var dwy=D[10];//b.halfDirectionWidth.y;
	        var dwz=D[11];//b.halfDirectionWidth.z;
	        var dhx=D[12];//b.halfDirectionHeight.x;
	        var dhy=D[13];//b.halfDirectionHeight.y;
	        var dhz=D[14];//b.halfDirectionHeight.z;
	        var ddx=D[15];//b.halfDirectionDepth.x;
	        var ddy=D[16];//b.halfDirectionDepth.y;
	        var ddz=D[17];//b.halfDirectionDepth.z;

	        var ncx=c.normalDirection.x;
	        var ncy=c.normalDirection.y;
	        var ncz=c.normalDirection.z;
	        var dcx=c.halfDirection.x;
	        var dcy=c.halfDirection.y;
	        var dcz=c.halfDirection.z;
	        var nx=sep.x;
	        var ny=sep.y;
	        var nz=sep.z;
	        var dotw=nx*nwx+ny*nwy+nz*nwz;
	        var doth=nx*nhx+ny*nhy+nz*nhz;
	        var dotd=nx*ndx+ny*ndy+nz*ndz;
	        var dotc=nx*ncx+ny*ncy+nz*ncz;
	        var right1=dotw>0;
	        var right2=doth>0;
	        var right3=dotd>0;
	        var right4=dotc>0;
	        if(!right1)dotw=-dotw;
	        if(!right2)doth=-doth;
	        if(!right3)dotd=-dotd;
	        if(!right4)dotc=-dotc;
	        var state=0;
	        if(dotc>0.999){
	        if(dotw>0.999){
	        if(dotw>dotc)state=1;
	        else state=4;
	        }else if(doth>0.999){
	        if(doth>dotc)state=2;
	        else state=4;
	        }else if(dotd>0.999){
	        if(dotd>dotc)state=3;
	        else state=4;
	        }else state=4;
	        }else{
	        if(dotw>0.999)state=1;
	        else if(doth>0.999)state=2;
	        else if(dotd>0.999)state=3;
	        }
	        var cbx;
	        var cby;
	        var cbz;
	        var ccx;
	        var ccy;
	        var ccz;
	        var r00;
	        var r01;
	        var r02;
	        var r10;
	        var r11;
	        var r12;
	        var r20;
	        var r21;
	        var r22;
	        var px;
	        var py;
	        var pz;
	        var pd;
	        var dot;
	        var len;
	        var tx;
	        var ty;
	        var tz;
	        var td;
	        var dx;
	        var dy;
	        var dz;
	        var d1x;
	        var d1y;
	        var d1z;
	        var d2x;
	        var d2y;
	        var d2z;
	        var sx;
	        var sy;
	        var sz;
	        var sd;
	        var ex;
	        var ey;
	        var ez;
	        var ed;
	        var dot1;
	        var dot2;
	        var t1;
	        var dir1x;
	        var dir1y;
	        var dir1z;
	        var dir2x;
	        var dir2y;
	        var dir2z;
	        var dir1l;
	        var dir2l;
	        if(state==0){
	        //manifold.addPoint(pos.x,pos.y,pos.z,nx,ny,nz,dep.x,b,c,0,0,false);
	        manifold.addPoint(pos.x,pos.y,pos.z,nx,ny,nz,dep.x,this.flip);
	        }else if(state==4){
	        if(right4){
	        ccx=pcx-dcx;
	        ccy=pcy-dcy;
	        ccz=pcz-dcz;
	        nx=-ncx;
	        ny=-ncy;
	        nz=-ncz;
	        }else{
	        ccx=pcx+dcx;
	        ccy=pcy+dcy;
	        ccz=pcz+dcz;
	        nx=ncx;
	        ny=ncy;
	        nz=ncz;
	        }
	        var v1x;
	        var v1y;
	        var v1z;
	        var v2x;
	        var v2y;
	        var v2z;
	        var v3x;
	        var v3y;
	        var v3z;
	        var v4x;
	        var v4y;
	        var v4z;
	        
	        dot=1;
	        state=0;
	        dot1=nwx*nx+nwy*ny+nwz*nz;
	        if(dot1<dot){
	        dot=dot1;
	        state=0;
	        }
	        if(-dot1<dot){
	        dot=-dot1;
	        state=1;
	        }
	        dot1=nhx*nx+nhy*ny+nhz*nz;
	        if(dot1<dot){
	        dot=dot1;
	        state=2;
	        }
	        if(-dot1<dot){
	        dot=-dot1;
	        state=3;
	        }
	        dot1=ndx*nx+ndy*ny+ndz*nz;
	        if(dot1<dot){
	        dot=dot1;
	        state=4;
	        }
	        if(-dot1<dot){
	        dot=-dot1;
	        state=5;
	        }
	        var v = b.elements;
	        switch(state){
	        case 0:
	        //v=b.vertex1;
	        v1x=v[0];//v.x;
	        v1y=v[1];//v.y;
	        v1z=v[2];//v.z;
	        //v=b.vertex3;
	        v2x=v[6];//v.x;
	        v2y=v[7];//v.y;
	        v2z=v[8];//v.z;
	        //v=b.vertex4;
	        v3x=v[9];//v.x;
	        v3y=v[10];//v.y;
	        v3z=v[11];//v.z;
	        //v=b.vertex2;
	        v4x=v[3];//v.x;
	        v4y=v[4];//v.y;
	        v4z=v[5];//v.z;
	        break;
	        case 1:
	        //v=b.vertex6;
	        v1x=v[15];//v.x;
	        v1y=v[16];//v.y;
	        v1z=v[17];//v.z;
	        //v=b.vertex8;
	        v2x=v[21];//v.x;
	        v2y=v[22];//v.y;
	        v2z=v[23];//v.z;
	        //v=b.vertex7;
	        v3x=v[18];//v.x;
	        v3y=v[19];//v.y;
	        v3z=v[20];//v.z;
	        //v=b.vertex5;
	        v4x=v[12];//v.x;
	        v4y=v[13];//v.y;
	        v4z=v[14];//v.z;
	        break;
	        case 2:
	        //v=b.vertex5;
	        v1x=v[12];//v.x;
	        v1y=v[13];//v.y;
	        v1z=v[14];//v.z;
	        //v=b.vertex1;
	        v2x=v[0];//v.x;
	        v2y=v[1];//v.y;
	        v2z=v[2];//v.z;
	        //v=b.vertex2;
	        v3x=v[3];//v.x;
	        v3y=v[4];//v.y;
	        v3z=v[5];//v.z;
	        //v=b.vertex6;
	        v4x=v[15];//v.x;
	        v4y=v[16];//v.y;
	        v4z=v[17];//v.z;
	        break;
	        case 3:
	        //v=b.vertex8;
	        v1x=v[21];//v.x;
	        v1y=v[22];//v.y;
	        v1z=v[23];//v.z;
	        //v=b.vertex4;
	        v2x=v[9];//v.x;
	        v2y=v[10];//v.y;
	        v2z=v[11];//v.z;
	        //v=b.vertex3;
	        v3x=v[6];//v.x;
	        v3y=v[7];//v.y;
	        v3z=v[8];//v.z;
	        //v=b.vertex7;
	        v4x=v[18];//v.x;
	        v4y=v[19];//v.y;
	        v4z=v[20];//v.z;
	        break;
	        case 4:
	        //v=b.vertex5;
	        v1x=v[12];//v.x;
	        v1y=v[13];//v.y;
	        v1z=v[14];//v.z;
	        //v=b.vertex7;
	        v2x=v[18];//v.x;
	        v2y=v[19];//v.y;
	        v2z=v[20];//v.z;
	        //v=b.vertex3;
	        v3x=v[6];//v.x;
	        v3y=v[7];//v.y;
	        v3z=v[8];//v.z;
	        //v=b.vertex1;
	        v4x=v[0];//v.x;
	        v4y=v[1];//v.y;
	        v4z=v[2];//v.z;
	        break;
	        case 5:
	        //v=b.vertex2;
	        v1x=v[3];//v.x;
	        v1y=v[4];//v.y;
	        v1z=v[5];//v.z;
	        //v=b.vertex4;
	        v2x=v[9];//v.x;
	        v2y=v[10];//v.y;
	        v2z=v[11];//v.z;
	        //v=b.vertex8;
	        v3x=v[21];//v.x;
	        v3y=v[22];//v.y;
	        v3z=v[23];//v.z;
	        //v=b.vertex6;
	        v4x=v[15];//v.x;
	        v4y=v[16];//v.y;
	        v4z=v[17];//v.z;
	        break;
	        }
	        pd=nx*(v1x-ccx)+ny*(v1y-ccy)+nz*(v1z-ccz);
	        if(pd<=0)manifold.addPoint(v1x,v1y,v1z,-nx,-ny,-nz,pd,this.flip);
	        pd=nx*(v2x-ccx)+ny*(v2y-ccy)+nz*(v2z-ccz);
	        if(pd<=0)manifold.addPoint(v2x,v2y,v2z,-nx,-ny,-nz,pd,this.flip);
	        pd=nx*(v3x-ccx)+ny*(v3y-ccy)+nz*(v3z-ccz);
	        if(pd<=0)manifold.addPoint(v3x,v3y,v3z,-nx,-ny,-nz,pd,this.flip);
	        pd=nx*(v4x-ccx)+ny*(v4y-ccy)+nz*(v4z-ccz);
	        if(pd<=0)manifold.addPoint(v4x,v4y,v4z,-nx,-ny,-nz,pd,this.flip);
	        }else{
	        switch(state){
	        case 1:
	        if(right1){
	        cbx=pbx+dwx;
	        cby=pby+dwy;
	        cbz=pbz+dwz;
	        nx=nwx;
	        ny=nwy;
	        nz=nwz;
	        }else{
	        cbx=pbx-dwx;
	        cby=pby-dwy;
	        cbz=pbz-dwz;
	        nx=-nwx;
	        ny=-nwy;
	        nz=-nwz;
	        }
	        dir1x=nhx;
	        dir1y=nhy;
	        dir1z=nhz;
	        dir1l=bh;
	        dir2x=ndx;
	        dir2y=ndy;
	        dir2z=ndz;
	        dir2l=bd;
	        break;
	        case 2:
	        if(right2){
	        cbx=pbx+dhx;
	        cby=pby+dhy;
	        cbz=pbz+dhz;
	        nx=nhx;
	        ny=nhy;
	        nz=nhz;
	        }else{
	        cbx=pbx-dhx;
	        cby=pby-dhy;
	        cbz=pbz-dhz;
	        nx=-nhx;
	        ny=-nhy;
	        nz=-nhz;
	        }
	        dir1x=nwx;
	        dir1y=nwy;
	        dir1z=nwz;
	        dir1l=bw;
	        dir2x=ndx;
	        dir2y=ndy;
	        dir2z=ndz;
	        dir2l=bd;
	        break;
	        case 3:
	        if(right3){
	        cbx=pbx+ddx;
	        cby=pby+ddy;
	        cbz=pbz+ddz;
	        nx=ndx;
	        ny=ndy;
	        nz=ndz;
	        }else{
	        cbx=pbx-ddx;
	        cby=pby-ddy;
	        cbz=pbz-ddz;
	        nx=-ndx;
	        ny=-ndy;
	        nz=-ndz;
	        }
	        dir1x=nwx;
	        dir1y=nwy;
	        dir1z=nwz;
	        dir1l=bw;
	        dir2x=nhx;
	        dir2y=nhy;
	        dir2z=nhz;
	        dir2l=bh;
	        break;
	        }
	        dot=nx*ncx+ny*ncy+nz*ncz;
	        if(dot<0)len=ch;
	        else len=-ch;
	        ccx=pcx+len*ncx;
	        ccy=pcy+len*ncy;
	        ccz=pcz+len*ncz;
	        if(dotc>=0.999999){
	        tx=-ny;
	        ty=nz;
	        tz=nx;
	        }else{
	        tx=nx;
	        ty=ny;
	        tz=nz;
	        }
	        len=tx*ncx+ty*ncy+tz*ncz;
	        dx=len*ncx-tx;
	        dy=len*ncy-ty;
	        dz=len*ncz-tz;
	        len=_Math.sqrt(dx*dx+dy*dy+dz*dz);
	        if(len==0)return;
	        len=r/len;
	        dx*=len;
	        dy*=len;
	        dz*=len;
	        tx=ccx+dx;
	        ty=ccy+dy;
	        tz=ccz+dz;
	        if(dot<-0.96||dot>0.96){
	        r00=ncx*ncx*1.5-0.5;
	        r01=ncx*ncy*1.5-ncz*0.866025403;
	        r02=ncx*ncz*1.5+ncy*0.866025403;
	        r10=ncy*ncx*1.5+ncz*0.866025403;
	        r11=ncy*ncy*1.5-0.5;
	        r12=ncy*ncz*1.5-ncx*0.866025403;
	        r20=ncz*ncx*1.5-ncy*0.866025403;
	        r21=ncz*ncy*1.5+ncx*0.866025403;
	        r22=ncz*ncz*1.5-0.5;
	        px=tx;
	        py=ty;
	        pz=tz;
	        pd=nx*(px-cbx)+ny*(py-cby)+nz*(pz-cbz);
	        tx=px-pd*nx-cbx;
	        ty=py-pd*ny-cby;
	        tz=pz-pd*nz-cbz;
	        sd=dir1x*tx+dir1y*ty+dir1z*tz;
	        ed=dir2x*tx+dir2y*ty+dir2z*tz;
	        if(sd<-dir1l)sd=-dir1l;
	        else if(sd>dir1l)sd=dir1l;
	        if(ed<-dir2l)ed=-dir2l;
	        else if(ed>dir2l)ed=dir2l;
	        tx=sd*dir1x+ed*dir2x;
	        ty=sd*dir1y+ed*dir2y;
	        tz=sd*dir1z+ed*dir2z;
	        px=cbx+tx;
	        py=cby+ty;
	        pz=cbz+tz;
	        manifold.addPoint(px,py,pz,nx,ny,nz,pd,this.flip);
	        px=dx*r00+dy*r01+dz*r02;
	        py=dx*r10+dy*r11+dz*r12;
	        pz=dx*r20+dy*r21+dz*r22;
	        px=(dx=px)+ccx;
	        py=(dy=py)+ccy;
	        pz=(dz=pz)+ccz;
	        pd=nx*(px-cbx)+ny*(py-cby)+nz*(pz-cbz);
	        if(pd<=0){
	        tx=px-pd*nx-cbx;
	        ty=py-pd*ny-cby;
	        tz=pz-pd*nz-cbz;
	        sd=dir1x*tx+dir1y*ty+dir1z*tz;
	        ed=dir2x*tx+dir2y*ty+dir2z*tz;
	        if(sd<-dir1l)sd=-dir1l;
	        else if(sd>dir1l)sd=dir1l;
	        if(ed<-dir2l)ed=-dir2l;
	        else if(ed>dir2l)ed=dir2l;
	        tx=sd*dir1x+ed*dir2x;
	        ty=sd*dir1y+ed*dir2y;
	        tz=sd*dir1z+ed*dir2z;
	        px=cbx+tx;
	        py=cby+ty;
	        pz=cbz+tz;
	        //manifold.addPoint(px,py,pz,nx,ny,nz,pd,b,c,2,0,false);
	        manifold.addPoint(px,py,pz,nx,ny,nz,pd,this.flip);
	        }
	        px=dx*r00+dy*r01+dz*r02;
	        py=dx*r10+dy*r11+dz*r12;
	        pz=dx*r20+dy*r21+dz*r22;
	        px=(dx=px)+ccx;
	        py=(dy=py)+ccy;
	        pz=(dz=pz)+ccz;
	        pd=nx*(px-cbx)+ny*(py-cby)+nz*(pz-cbz);
	        if(pd<=0){
	        tx=px-pd*nx-cbx;
	        ty=py-pd*ny-cby;
	        tz=pz-pd*nz-cbz;
	        sd=dir1x*tx+dir1y*ty+dir1z*tz;
	        ed=dir2x*tx+dir2y*ty+dir2z*tz;
	        if(sd<-dir1l)sd=-dir1l;
	        else if(sd>dir1l)sd=dir1l;
	        if(ed<-dir2l)ed=-dir2l;
	        else if(ed>dir2l)ed=dir2l;
	        tx=sd*dir1x+ed*dir2x;
	        ty=sd*dir1y+ed*dir2y;
	        tz=sd*dir1z+ed*dir2z;
	        px=cbx+tx;
	        py=cby+ty;
	        pz=cbz+tz;
	        //manifold.addPoint(px,py,pz,nx,ny,nz,pd,b,c,3,0,false);
	        manifold.addPoint(px,py,pz,nx,ny,nz,pd,this.flip);
	        }
	        }else{
	        sx=tx;
	        sy=ty;
	        sz=tz;
	        sd=nx*(sx-cbx)+ny*(sy-cby)+nz*(sz-cbz);
	        sx-=sd*nx;
	        sy-=sd*ny;
	        sz-=sd*nz;
	        if(dot>0){
	        ex=tx+dcx*2;
	        ey=ty+dcy*2;
	        ez=tz+dcz*2;
	        }else{
	        ex=tx-dcx*2;
	        ey=ty-dcy*2;
	        ez=tz-dcz*2;
	        }
	        ed=nx*(ex-cbx)+ny*(ey-cby)+nz*(ez-cbz);
	        ex-=ed*nx;
	        ey-=ed*ny;
	        ez-=ed*nz;
	        d1x=sx-cbx;
	        d1y=sy-cby;
	        d1z=sz-cbz;
	        d2x=ex-cbx;
	        d2y=ey-cby;
	        d2z=ez-cbz;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        td=ed-sd;
	        dotw=d1x*dir1x+d1y*dir1y+d1z*dir1z;
	        doth=d2x*dir1x+d2y*dir1y+d2z*dir1z;
	        dot1=dotw-dir1l;
	        dot2=doth-dir1l;
	        if(dot1>0){
	        if(dot2>0)return;
	        t1=dot1/(dot1-dot2);
	        sx=sx+tx*t1;
	        sy=sy+ty*t1;
	        sz=sz+tz*t1;
	        sd=sd+td*t1;
	        d1x=sx-cbx;
	        d1y=sy-cby;
	        d1z=sz-cbz;
	        dotw=d1x*dir1x+d1y*dir1y+d1z*dir1z;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        td=ed-sd;
	        }else if(dot2>0){
	        t1=dot1/(dot1-dot2);
	        ex=sx+tx*t1;
	        ey=sy+ty*t1;
	        ez=sz+tz*t1;
	        ed=sd+td*t1;
	        d2x=ex-cbx;
	        d2y=ey-cby;
	        d2z=ez-cbz;
	        doth=d2x*dir1x+d2y*dir1y+d2z*dir1z;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        td=ed-sd;
	        }
	        dot1=dotw+dir1l;
	        dot2=doth+dir1l;
	        if(dot1<0){
	        if(dot2<0)return;
	        t1=dot1/(dot1-dot2);
	        sx=sx+tx*t1;
	        sy=sy+ty*t1;
	        sz=sz+tz*t1;
	        sd=sd+td*t1;
	        d1x=sx-cbx;
	        d1y=sy-cby;
	        d1z=sz-cbz;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        td=ed-sd;
	        }else if(dot2<0){
	        t1=dot1/(dot1-dot2);
	        ex=sx+tx*t1;
	        ey=sy+ty*t1;
	        ez=sz+tz*t1;
	        ed=sd+td*t1;
	        d2x=ex-cbx;
	        d2y=ey-cby;
	        d2z=ez-cbz;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        td=ed-sd;
	        }
	        dotw=d1x*dir2x+d1y*dir2y+d1z*dir2z;
	        doth=d2x*dir2x+d2y*dir2y+d2z*dir2z;
	        dot1=dotw-dir2l;
	        dot2=doth-dir2l;
	        if(dot1>0){
	        if(dot2>0)return;
	        t1=dot1/(dot1-dot2);
	        sx=sx+tx*t1;
	        sy=sy+ty*t1;
	        sz=sz+tz*t1;
	        sd=sd+td*t1;
	        d1x=sx-cbx;
	        d1y=sy-cby;
	        d1z=sz-cbz;
	        dotw=d1x*dir2x+d1y*dir2y+d1z*dir2z;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        td=ed-sd;
	        }else if(dot2>0){
	        t1=dot1/(dot1-dot2);
	        ex=sx+tx*t1;
	        ey=sy+ty*t1;
	        ez=sz+tz*t1;
	        ed=sd+td*t1;
	        d2x=ex-cbx;
	        d2y=ey-cby;
	        d2z=ez-cbz;
	        doth=d2x*dir2x+d2y*dir2y+d2z*dir2z;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        td=ed-sd;
	        }
	        dot1=dotw+dir2l;
	        dot2=doth+dir2l;
	        if(dot1<0){
	        if(dot2<0)return;
	        t1=dot1/(dot1-dot2);
	        sx=sx+tx*t1;
	        sy=sy+ty*t1;
	        sz=sz+tz*t1;
	        sd=sd+td*t1;
	        }else if(dot2<0){
	        t1=dot1/(dot1-dot2);
	        ex=sx+tx*t1;
	        ey=sy+ty*t1;
	        ez=sz+tz*t1;
	        ed=sd+td*t1;
	        }
	        if(sd<0){
	        //manifold.addPoint(sx,sy,sz,nx,ny,nz,sd,b,c,1,0,false);
	        manifold.addPoint(sx,sy,sz,nx,ny,nz,sd,this.flip);
	        }
	        if(ed<0){
	        //manifold.addPoint(ex,ey,ez,nx,ny,nz,ed,b,c,4,0,false);
	        manifold.addPoint(ex,ey,ez,nx,ny,nz,ed,this.flip);
	        }
	        }
	        }

	    }

	    });

	function CylinderCylinderCollisionDetector() {
	    
	    CollisionDetector.call( this );

	}

	CylinderCylinderCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: CylinderCylinderCollisionDetector,


	    getSep: function ( c1, c2, sep, pos, dep ) {

	        var t1x;
	        var t1y;
	        var t1z;
	        var t2x;
	        var t2y;
	        var t2z;
	        var sup=new Vec3();
	        var len;
	        var p1x;
	        var p1y;
	        var p1z;
	        var p2x;
	        var p2y;
	        var p2z;
	        var v01x=c1.position.x;
	        var v01y=c1.position.y;
	        var v01z=c1.position.z;
	        var v02x=c2.position.x;
	        var v02y=c2.position.y;
	        var v02z=c2.position.z;
	        var v0x=v02x-v01x;
	        var v0y=v02y-v01y;
	        var v0z=v02z-v01z;
	        if(v0x*v0x+v0y*v0y+v0z*v0z==0)v0y=0.001;
	        var nx=-v0x;
	        var ny=-v0y;
	        var nz=-v0z;
	        this.supportPoint(c1,-nx,-ny,-nz,sup);
	        var v11x=sup.x;
	        var v11y=sup.y;
	        var v11z=sup.z;
	        this.supportPoint(c2,nx,ny,nz,sup);
	        var v12x=sup.x;
	        var v12y=sup.y;
	        var v12z=sup.z;
	        var v1x=v12x-v11x;
	        var v1y=v12y-v11y;
	        var v1z=v12z-v11z;
	        if(v1x*nx+v1y*ny+v1z*nz<=0){
	        return false;
	        }
	        nx=v1y*v0z-v1z*v0y;
	        ny=v1z*v0x-v1x*v0z;
	        nz=v1x*v0y-v1y*v0x;
	        if(nx*nx+ny*ny+nz*nz==0){
	        sep.set( v1x-v0x, v1y-v0y, v1z-v0z ).normalize();
	        pos.set( (v11x+v12x)*0.5, (v11y+v12y)*0.5, (v11z+v12z)*0.5 );
	        return true;
	        }
	        this.supportPoint(c1,-nx,-ny,-nz,sup);
	        var v21x=sup.x;
	        var v21y=sup.y;
	        var v21z=sup.z;
	        this.supportPoint(c2,nx,ny,nz,sup);
	        var v22x=sup.x;
	        var v22y=sup.y;
	        var v22z=sup.z;
	        var v2x=v22x-v21x;
	        var v2y=v22y-v21y;
	        var v2z=v22z-v21z;
	        if(v2x*nx+v2y*ny+v2z*nz<=0){
	        return false;
	        }
	        t1x=v1x-v0x;
	        t1y=v1y-v0y;
	        t1z=v1z-v0z;
	        t2x=v2x-v0x;
	        t2y=v2y-v0y;
	        t2z=v2z-v0z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        if(nx*v0x+ny*v0y+nz*v0z>0){
	        t1x=v1x;
	        t1y=v1y;
	        t1z=v1z;
	        v1x=v2x;
	        v1y=v2y;
	        v1z=v2z;
	        v2x=t1x;
	        v2y=t1y;
	        v2z=t1z;
	        t1x=v11x;
	        t1y=v11y;
	        t1z=v11z;
	        v11x=v21x;
	        v11y=v21y;
	        v11z=v21z;
	        v21x=t1x;
	        v21y=t1y;
	        v21z=t1z;
	        t1x=v12x;
	        t1y=v12y;
	        t1z=v12z;
	        v12x=v22x;
	        v12y=v22y;
	        v12z=v22z;
	        v22x=t1x;
	        v22y=t1y;
	        v22z=t1z;
	        nx=-nx;
	        ny=-ny;
	        nz=-nz;
	        }
	        var iterations=0;
	        while(true){
	        if(++iterations>100){
	        return false;
	        }
	        this.supportPoint(c1,-nx,-ny,-nz,sup);
	        var v31x=sup.x;
	        var v31y=sup.y;
	        var v31z=sup.z;
	        this.supportPoint(c2,nx,ny,nz,sup);
	        var v32x=sup.x;
	        var v32y=sup.y;
	        var v32z=sup.z;
	        var v3x=v32x-v31x;
	        var v3y=v32y-v31y;
	        var v3z=v32z-v31z;
	        if(v3x*nx+v3y*ny+v3z*nz<=0){
	        return false;
	        }
	        if((v1y*v3z-v1z*v3y)*v0x+(v1z*v3x-v1x*v3z)*v0y+(v1x*v3y-v1y*v3x)*v0z<0){
	        v2x=v3x;
	        v2y=v3y;
	        v2z=v3z;
	        v21x=v31x;
	        v21y=v31y;
	        v21z=v31z;
	        v22x=v32x;
	        v22y=v32y;
	        v22z=v32z;
	        t1x=v1x-v0x;
	        t1y=v1y-v0y;
	        t1z=v1z-v0z;
	        t2x=v3x-v0x;
	        t2y=v3y-v0y;
	        t2z=v3z-v0z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        continue;
	        }
	        if((v3y*v2z-v3z*v2y)*v0x+(v3z*v2x-v3x*v2z)*v0y+(v3x*v2y-v3y*v2x)*v0z<0){
	        v1x=v3x;
	        v1y=v3y;
	        v1z=v3z;
	        v11x=v31x;
	        v11y=v31y;
	        v11z=v31z;
	        v12x=v32x;
	        v12y=v32y;
	        v12z=v32z;
	        t1x=v3x-v0x;
	        t1y=v3y-v0y;
	        t1z=v3z-v0z;
	        t2x=v2x-v0x;
	        t2y=v2y-v0y;
	        t2z=v2z-v0z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        continue;
	        }
	        var hit=false;
	        while(true){
	        t1x=v2x-v1x;
	        t1y=v2y-v1y;
	        t1z=v2z-v1z;
	        t2x=v3x-v1x;
	        t2y=v3y-v1y;
	        t2z=v3z-v1z;
	        nx=t1y*t2z-t1z*t2y;
	        ny=t1z*t2x-t1x*t2z;
	        nz=t1x*t2y-t1y*t2x;
	        len=1/_Math.sqrt(nx*nx+ny*ny+nz*nz);
	        nx*=len;
	        ny*=len;
	        nz*=len;
	        if(nx*v1x+ny*v1y+nz*v1z>=0&&!hit){
	        var b0=(v1y*v2z-v1z*v2y)*v3x+(v1z*v2x-v1x*v2z)*v3y+(v1x*v2y-v1y*v2x)*v3z;
	        var b1=(v3y*v2z-v3z*v2y)*v0x+(v3z*v2x-v3x*v2z)*v0y+(v3x*v2y-v3y*v2x)*v0z;
	        var b2=(v0y*v1z-v0z*v1y)*v3x+(v0z*v1x-v0x*v1z)*v3y+(v0x*v1y-v0y*v1x)*v3z;
	        var b3=(v2y*v1z-v2z*v1y)*v0x+(v2z*v1x-v2x*v1z)*v0y+(v2x*v1y-v2y*v1x)*v0z;
	        var sum=b0+b1+b2+b3;
	        if(sum<=0){
	        b0=0;
	        b1=(v2y*v3z-v2z*v3y)*nx+(v2z*v3x-v2x*v3z)*ny+(v2x*v3y-v2y*v3x)*nz;
	        b2=(v3y*v2z-v3z*v2y)*nx+(v3z*v2x-v3x*v2z)*ny+(v3x*v2y-v3y*v2x)*nz;
	        b3=(v1y*v2z-v1z*v2y)*nx+(v1z*v2x-v1x*v2z)*ny+(v1x*v2y-v1y*v2x)*nz;
	        sum=b1+b2+b3;
	        }
	        var inv=1/sum;
	        p1x=(v01x*b0+v11x*b1+v21x*b2+v31x*b3)*inv;
	        p1y=(v01y*b0+v11y*b1+v21y*b2+v31y*b3)*inv;
	        p1z=(v01z*b0+v11z*b1+v21z*b2+v31z*b3)*inv;
	        p2x=(v02x*b0+v12x*b1+v22x*b2+v32x*b3)*inv;
	        p2y=(v02y*b0+v12y*b1+v22y*b2+v32y*b3)*inv;
	        p2z=(v02z*b0+v12z*b1+v22z*b2+v32z*b3)*inv;
	        hit=true;
	        }
	        this.supportPoint(c1,-nx,-ny,-nz,sup);
	        var v41x=sup.x;
	        var v41y=sup.y;
	        var v41z=sup.z;
	        this.supportPoint(c2,nx,ny,nz,sup);
	        var v42x=sup.x;
	        var v42y=sup.y;
	        var v42z=sup.z;
	        var v4x=v42x-v41x;
	        var v4y=v42y-v41y;
	        var v4z=v42z-v41z;
	        var separation=-(v4x*nx+v4y*ny+v4z*nz);
	        if((v4x-v3x)*nx+(v4y-v3y)*ny+(v4z-v3z)*nz<=0.01||separation>=0){
	        if(hit){
	        sep.set( -nx, -ny, -nz );
	        pos.set( (p1x+p2x)*0.5, (p1y+p2y)*0.5, (p1z+p2z)*0.5 );
	        dep.x=separation;
	        return true;
	        }
	        return false;
	        }
	        if(
	        (v4y*v1z-v4z*v1y)*v0x+
	        (v4z*v1x-v4x*v1z)*v0y+
	        (v4x*v1y-v4y*v1x)*v0z<0
	        ){
	        if(
	        (v4y*v2z-v4z*v2y)*v0x+
	        (v4z*v2x-v4x*v2z)*v0y+
	        (v4x*v2y-v4y*v2x)*v0z<0
	        ){
	        v1x=v4x;
	        v1y=v4y;
	        v1z=v4z;
	        v11x=v41x;
	        v11y=v41y;
	        v11z=v41z;
	        v12x=v42x;
	        v12y=v42y;
	        v12z=v42z;
	        }else{
	        v3x=v4x;
	        v3y=v4y;
	        v3z=v4z;
	        v31x=v41x;
	        v31y=v41y;
	        v31z=v41z;
	        v32x=v42x;
	        v32y=v42y;
	        v32z=v42z;
	        }
	        }else{
	        if(
	        (v4y*v3z-v4z*v3y)*v0x+
	        (v4z*v3x-v4x*v3z)*v0y+
	        (v4x*v3y-v4y*v3x)*v0z<0
	        ){
	        v2x=v4x;
	        v2y=v4y;
	        v2z=v4z;
	        v21x=v41x;
	        v21y=v41y;
	        v21z=v41z;
	        v22x=v42x;
	        v22y=v42y;
	        v22z=v42z;
	        }else{
	        v1x=v4x;
	        v1y=v4y;
	        v1z=v4z;
	        v11x=v41x;
	        v11y=v41y;
	        v11z=v41z;
	        v12x=v42x;
	        v12y=v42y;
	        v12z=v42z;
	        }
	        }
	        }
	        }
	        //return false;
	    },

	    supportPoint: function ( c, dx, dy, dz, out ) {

	        var rot=c.rotation.elements;
	        var ldx=rot[0]*dx+rot[3]*dy+rot[6]*dz;
	        var ldy=rot[1]*dx+rot[4]*dy+rot[7]*dz;
	        var ldz=rot[2]*dx+rot[5]*dy+rot[8]*dz;
	        var radx=ldx;
	        var radz=ldz;
	        var len=radx*radx+radz*radz;
	        var rad=c.radius;
	        var hh=c.halfHeight;
	        var ox;
	        var oy;
	        var oz;
	        if(len==0){
	        if(ldy<0){
	        ox=rad;
	        oy=-hh;
	        oz=0;
	        }else{
	        ox=rad;
	        oy=hh;
	        oz=0;
	        }
	        }else{
	        len=c.radius/_Math.sqrt(len);
	        if(ldy<0){
	        ox=radx*len;
	        oy=-hh;
	        oz=radz*len;
	        }else{
	        ox=radx*len;
	        oy=hh;
	        oz=radz*len;
	        }
	        }
	        ldx=rot[0]*ox+rot[1]*oy+rot[2]*oz+c.position.x;
	        ldy=rot[3]*ox+rot[4]*oy+rot[5]*oz+c.position.y;
	        ldz=rot[6]*ox+rot[7]*oy+rot[8]*oz+c.position.z;
	        out.set( ldx, ldy, ldz );

	    },

	    detectCollision: function ( shape1, shape2, manifold ) {

	        var c1;
	        var c2;
	        if(shape1.id<shape2.id){
	            c1=shape1;
	            c2=shape2;
	        }else{
	            c1=shape2;
	            c2=shape1;
	        }
	        var p1=c1.position;
	        var p2=c2.position;
	        var p1x=p1.x;
	        var p1y=p1.y;
	        var p1z=p1.z;
	        var p2x=p2.x;
	        var p2y=p2.y;
	        var p2z=p2.z;
	        var h1=c1.halfHeight;
	        var h2=c2.halfHeight;
	        var n1=c1.normalDirection;
	        var n2=c2.normalDirection;
	        var d1=c1.halfDirection;
	        var d2=c2.halfDirection;
	        var r1=c1.radius;
	        var r2=c2.radius;
	        var n1x=n1.x;
	        var n1y=n1.y;
	        var n1z=n1.z;
	        var n2x=n2.x;
	        var n2y=n2.y;
	        var n2z=n2.z;
	        var d1x=d1.x;
	        var d1y=d1.y;
	        var d1z=d1.z;
	        var d2x=d2.x;
	        var d2y=d2.y;
	        var d2z=d2.z;
	        var dx=p1x-p2x;
	        var dy=p1y-p2y;
	        var dz=p1z-p2z;
	        var len;
	        var c1x;
	        var c1y;
	        var c1z;
	        var c2x;
	        var c2y;
	        var c2z;
	        var tx;
	        var ty;
	        var tz;
	        var sx;
	        var sy;
	        var sz;
	        var ex;
	        var ey;
	        var ez;
	        var depth1;
	        var depth2;
	        var dot;
	        var t1;
	        var t2;
	        var sep=new Vec3();
	        var pos=new Vec3();
	        var dep=new Vec3();
	        if(!this.getSep(c1,c2,sep,pos,dep))return;
	        var dot1=sep.x*n1x+sep.y*n1y+sep.z*n1z;
	        var dot2=sep.x*n2x+sep.y*n2y+sep.z*n2z;
	        var right1=dot1>0;
	        var right2=dot2>0;
	        if(!right1)dot1=-dot1;
	        if(!right2)dot2=-dot2;
	        var state=0;
	        if(dot1>0.999||dot2>0.999){
	        if(dot1>dot2)state=1;
	        else state=2;
	        }
	        var nx;
	        var ny;
	        var nz;
	        var depth=dep.x;
	        var r00;
	        var r01;
	        var r02;
	        var r10;
	        var r11;
	        var r12;
	        var r20;
	        var r21;
	        var r22;
	        var px;
	        var py;
	        var pz;
	        var pd;
	        var a;
	        var b;
	        var e;
	        var f;
	        nx=sep.x;
	        ny=sep.y;
	        nz=sep.z;
	        switch(state){
	        case 0:
	        manifold.addPoint(pos.x,pos.y,pos.z,nx,ny,nz,depth,false);
	        break;
	        case 1:
	        if(right1){
	        c1x=p1x+d1x;
	        c1y=p1y+d1y;
	        c1z=p1z+d1z;
	        nx=n1x;
	        ny=n1y;
	        nz=n1z;
	        }else{
	        c1x=p1x-d1x;
	        c1y=p1y-d1y;
	        c1z=p1z-d1z;
	        nx=-n1x;
	        ny=-n1y;
	        nz=-n1z;
	        }
	        dot=nx*n2x+ny*n2y+nz*n2z;
	        if(dot<0)len=h2;
	        else len=-h2;
	        c2x=p2x+len*n2x;
	        c2y=p2y+len*n2y;
	        c2z=p2z+len*n2z;
	        if(dot2>=0.999999){
	        tx=-ny;
	        ty=nz;
	        tz=nx;
	        }else{
	        tx=nx;
	        ty=ny;
	        tz=nz;
	        }
	        len=tx*n2x+ty*n2y+tz*n2z;
	        dx=len*n2x-tx;
	        dy=len*n2y-ty;
	        dz=len*n2z-tz;
	        len=_Math.sqrt(dx*dx+dy*dy+dz*dz);
	        if(len==0)break;
	        len=r2/len;
	        dx*=len;
	        dy*=len;
	        dz*=len;
	        tx=c2x+dx;
	        ty=c2y+dy;
	        tz=c2z+dz;
	        if(dot<-0.96||dot>0.96){
	        r00=n2x*n2x*1.5-0.5;
	        r01=n2x*n2y*1.5-n2z*0.866025403;
	        r02=n2x*n2z*1.5+n2y*0.866025403;
	        r10=n2y*n2x*1.5+n2z*0.866025403;
	        r11=n2y*n2y*1.5-0.5;
	        r12=n2y*n2z*1.5-n2x*0.866025403;
	        r20=n2z*n2x*1.5-n2y*0.866025403;
	        r21=n2z*n2y*1.5+n2x*0.866025403;
	        r22=n2z*n2z*1.5-0.5;
	        px=tx;
	        py=ty;
	        pz=tz;
	        pd=nx*(px-c1x)+ny*(py-c1y)+nz*(pz-c1z);
	        tx=px-pd*nx-c1x;
	        ty=py-pd*ny-c1y;
	        tz=pz-pd*nz-c1z;
	        len=tx*tx+ty*ty+tz*tz;
	        if(len>r1*r1){
	        len=r1/_Math.sqrt(len);
	        tx*=len;
	        ty*=len;
	        tz*=len;
	        }
	        px=c1x+tx;
	        py=c1y+ty;
	        pz=c1z+tz;
	        manifold.addPoint(px,py,pz,nx,ny,nz,pd,false);
	        px=dx*r00+dy*r01+dz*r02;
	        py=dx*r10+dy*r11+dz*r12;
	        pz=dx*r20+dy*r21+dz*r22;
	        px=(dx=px)+c2x;
	        py=(dy=py)+c2y;
	        pz=(dz=pz)+c2z;
	        pd=nx*(px-c1x)+ny*(py-c1y)+nz*(pz-c1z);
	        if(pd<=0){
	        tx=px-pd*nx-c1x;
	        ty=py-pd*ny-c1y;
	        tz=pz-pd*nz-c1z;
	        len=tx*tx+ty*ty+tz*tz;
	        if(len>r1*r1){
	        len=r1/_Math.sqrt(len);
	        tx*=len;
	        ty*=len;
	        tz*=len;
	        }
	        px=c1x+tx;
	        py=c1y+ty;
	        pz=c1z+tz;
	        manifold.addPoint(px,py,pz,nx,ny,nz,pd,false);
	        }
	        px=dx*r00+dy*r01+dz*r02;
	        py=dx*r10+dy*r11+dz*r12;
	        pz=dx*r20+dy*r21+dz*r22;
	        px=(dx=px)+c2x;
	        py=(dy=py)+c2y;
	        pz=(dz=pz)+c2z;
	        pd=nx*(px-c1x)+ny*(py-c1y)+nz*(pz-c1z);
	        if(pd<=0){
	        tx=px-pd*nx-c1x;
	        ty=py-pd*ny-c1y;
	        tz=pz-pd*nz-c1z;
	        len=tx*tx+ty*ty+tz*tz;
	        if(len>r1*r1){
	        len=r1/_Math.sqrt(len);
	        tx*=len;
	        ty*=len;
	        tz*=len;
	        }
	        px=c1x+tx;
	        py=c1y+ty;
	        pz=c1z+tz;
	        manifold.addPoint(px,py,pz,nx,ny,nz,pd,false);
	        }
	        }else{
	        sx=tx;
	        sy=ty;
	        sz=tz;
	        depth1=nx*(sx-c1x)+ny*(sy-c1y)+nz*(sz-c1z);
	        sx-=depth1*nx;
	        sy-=depth1*ny;
	        sz-=depth1*nz;
	        if(dot>0){
	        ex=tx+n2x*h2*2;
	        ey=ty+n2y*h2*2;
	        ez=tz+n2z*h2*2;
	        }else{
	        ex=tx-n2x*h2*2;
	        ey=ty-n2y*h2*2;
	        ez=tz-n2z*h2*2;
	        }
	        depth2=nx*(ex-c1x)+ny*(ey-c1y)+nz*(ez-c1z);
	        ex-=depth2*nx;
	        ey-=depth2*ny;
	        ez-=depth2*nz;
	        dx=c1x-sx;
	        dy=c1y-sy;
	        dz=c1z-sz;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        a=dx*dx+dy*dy+dz*dz;
	        b=dx*tx+dy*ty+dz*tz;
	        e=tx*tx+ty*ty+tz*tz;
	        f=b*b-e*(a-r1*r1);
	        if(f<0)break;
	        f=_Math.sqrt(f);
	        t1=(b+f)/e;
	        t2=(b-f)/e;
	        if(t2<t1){
	        len=t1;
	        t1=t2;
	        t2=len;
	        }
	        if(t2>1)t2=1;
	        if(t1<0)t1=0;
	        tx=sx+(ex-sx)*t1;
	        ty=sy+(ey-sy)*t1;
	        tz=sz+(ez-sz)*t1;
	        ex=sx+(ex-sx)*t2;
	        ey=sy+(ey-sy)*t2;
	        ez=sz+(ez-sz)*t2;
	        sx=tx;
	        sy=ty;
	        sz=tz;
	        len=depth1+(depth2-depth1)*t1;
	        depth2=depth1+(depth2-depth1)*t2;
	        depth1=len;
	        if(depth1<0) manifold.addPoint(sx,sy,sz,nx,ny,nz,pd,false);
	        if(depth2<0) manifold.addPoint(ex,ey,ez,nx,ny,nz,pd,false);
	        
	        }
	        break;
	        case 2:
	        if(right2){
	        c2x=p2x-d2x;
	        c2y=p2y-d2y;
	        c2z=p2z-d2z;
	        nx=-n2x;
	        ny=-n2y;
	        nz=-n2z;
	        }else{
	        c2x=p2x+d2x;
	        c2y=p2y+d2y;
	        c2z=p2z+d2z;
	        nx=n2x;
	        ny=n2y;
	        nz=n2z;
	        }
	        dot=nx*n1x+ny*n1y+nz*n1z;
	        if(dot<0)len=h1;
	        else len=-h1;
	        c1x=p1x+len*n1x;
	        c1y=p1y+len*n1y;
	        c1z=p1z+len*n1z;
	        if(dot1>=0.999999){
	        tx=-ny;
	        ty=nz;
	        tz=nx;
	        }else{
	        tx=nx;
	        ty=ny;
	        tz=nz;
	        }
	        len=tx*n1x+ty*n1y+tz*n1z;
	        dx=len*n1x-tx;
	        dy=len*n1y-ty;
	        dz=len*n1z-tz;
	        len=_Math.sqrt(dx*dx+dy*dy+dz*dz);
	        if(len==0)break;
	        len=r1/len;
	        dx*=len;
	        dy*=len;
	        dz*=len;
	        tx=c1x+dx;
	        ty=c1y+dy;
	        tz=c1z+dz;
	        if(dot<-0.96||dot>0.96){
	        r00=n1x*n1x*1.5-0.5;
	        r01=n1x*n1y*1.5-n1z*0.866025403;
	        r02=n1x*n1z*1.5+n1y*0.866025403;
	        r10=n1y*n1x*1.5+n1z*0.866025403;
	        r11=n1y*n1y*1.5-0.5;
	        r12=n1y*n1z*1.5-n1x*0.866025403;
	        r20=n1z*n1x*1.5-n1y*0.866025403;
	        r21=n1z*n1y*1.5+n1x*0.866025403;
	        r22=n1z*n1z*1.5-0.5;
	        px=tx;
	        py=ty;
	        pz=tz;
	        pd=nx*(px-c2x)+ny*(py-c2y)+nz*(pz-c2z);
	        tx=px-pd*nx-c2x;
	        ty=py-pd*ny-c2y;
	        tz=pz-pd*nz-c2z;
	        len=tx*tx+ty*ty+tz*tz;
	        if(len>r2*r2){
	        len=r2/_Math.sqrt(len);
	        tx*=len;
	        ty*=len;
	        tz*=len;
	        }
	        px=c2x+tx;
	        py=c2y+ty;
	        pz=c2z+tz;
	        manifold.addPoint(px,py,pz,-nx,-ny,-nz,pd,false);
	        px=dx*r00+dy*r01+dz*r02;
	        py=dx*r10+dy*r11+dz*r12;
	        pz=dx*r20+dy*r21+dz*r22;
	        px=(dx=px)+c1x;
	        py=(dy=py)+c1y;
	        pz=(dz=pz)+c1z;
	        pd=nx*(px-c2x)+ny*(py-c2y)+nz*(pz-c2z);
	        if(pd<=0){
	        tx=px-pd*nx-c2x;
	        ty=py-pd*ny-c2y;
	        tz=pz-pd*nz-c2z;
	        len=tx*tx+ty*ty+tz*tz;
	        if(len>r2*r2){
	        len=r2/_Math.sqrt(len);
	        tx*=len;
	        ty*=len;
	        tz*=len;
	        }
	        px=c2x+tx;
	        py=c2y+ty;
	        pz=c2z+tz;
	        manifold.addPoint(px,py,pz,-nx,-ny,-nz,pd,false);
	        }
	        px=dx*r00+dy*r01+dz*r02;
	        py=dx*r10+dy*r11+dz*r12;
	        pz=dx*r20+dy*r21+dz*r22;
	        px=(dx=px)+c1x;
	        py=(dy=py)+c1y;
	        pz=(dz=pz)+c1z;
	        pd=nx*(px-c2x)+ny*(py-c2y)+nz*(pz-c2z);
	        if(pd<=0){
	        tx=px-pd*nx-c2x;
	        ty=py-pd*ny-c2y;
	        tz=pz-pd*nz-c2z;
	        len=tx*tx+ty*ty+tz*tz;
	        if(len>r2*r2){
	        len=r2/_Math.sqrt(len);
	        tx*=len;
	        ty*=len;
	        tz*=len;
	        }
	        px=c2x+tx;
	        py=c2y+ty;
	        pz=c2z+tz;
	        manifold.addPoint(px,py,pz,-nx,-ny,-nz,pd,false);
	        }
	        }else{
	        sx=tx;
	        sy=ty;
	        sz=tz;
	        depth1=nx*(sx-c2x)+ny*(sy-c2y)+nz*(sz-c2z);
	        sx-=depth1*nx;
	        sy-=depth1*ny;
	        sz-=depth1*nz;
	        if(dot>0){
	        ex=tx+n1x*h1*2;
	        ey=ty+n1y*h1*2;
	        ez=tz+n1z*h1*2;
	        }else{
	        ex=tx-n1x*h1*2;
	        ey=ty-n1y*h1*2;
	        ez=tz-n1z*h1*2;
	        }
	        depth2=nx*(ex-c2x)+ny*(ey-c2y)+nz*(ez-c2z);
	        ex-=depth2*nx;
	        ey-=depth2*ny;
	        ez-=depth2*nz;
	        dx=c2x-sx;
	        dy=c2y-sy;
	        dz=c2z-sz;
	        tx=ex-sx;
	        ty=ey-sy;
	        tz=ez-sz;
	        a=dx*dx+dy*dy+dz*dz;
	        b=dx*tx+dy*ty+dz*tz;
	        e=tx*tx+ty*ty+tz*tz;
	        f=b*b-e*(a-r2*r2);
	        if(f<0)break;
	        f=_Math.sqrt(f);
	        t1=(b+f)/e;
	        t2=(b-f)/e;
	        if(t2<t1){
	        len=t1;
	        t1=t2;
	        t2=len;
	        }
	        if(t2>1)t2=1;
	        if(t1<0)t1=0;
	        tx=sx+(ex-sx)*t1;
	        ty=sy+(ey-sy)*t1;
	        tz=sz+(ez-sz)*t1;
	        ex=sx+(ex-sx)*t2;
	        ey=sy+(ey-sy)*t2;
	        ez=sz+(ez-sz)*t2;
	        sx=tx;
	        sy=ty;
	        sz=tz;
	        len=depth1+(depth2-depth1)*t1;
	        depth2=depth1+(depth2-depth1)*t2;
	        depth1=len;
	        if(depth1<0){
	        manifold.addPoint(sx,sy,sz,-nx,-ny,-nz,depth1,false);
	        }
	        if(depth2<0){
	        manifold.addPoint(ex,ey,ez,-nx,-ny,-nz,depth2,false);
	        }
	        }
	        break;
	        }

	    }

	});

	/**
	 * A collision detector which detects collisions between sphere and box.
	 * @author saharan
	 */
	function SphereBoxCollisionDetector ( flip ) {
	    
	    CollisionDetector.call( this );
	    this.flip = flip;

	}

	SphereBoxCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: SphereBoxCollisionDetector,

	    detectCollision: function ( shape1, shape2, manifold ) {

	        var s;
	        var b;
	        if(this.flip){
	            s=(shape2);
	            b=(shape1);
	        }else{
	            s=(shape1);
	            b=(shape2);
	        }

	        var D = b.dimentions;

	        var ps=s.position;
	        var psx=ps.x;
	        var psy=ps.y;
	        var psz=ps.z;
	        var pb=b.position;
	        var pbx=pb.x;
	        var pby=pb.y;
	        var pbz=pb.z;
	        var rad=s.radius;

	        var hw=b.halfWidth;
	        var hh=b.halfHeight;
	        var hd=b.halfDepth;

	        var dx=psx-pbx;
	        var dy=psy-pby;
	        var dz=psz-pbz;
	        var sx=D[0]*dx+D[1]*dy+D[2]*dz;
	        var sy=D[3]*dx+D[4]*dy+D[5]*dz;
	        var sz=D[6]*dx+D[7]*dy+D[8]*dz;
	        var cx;
	        var cy;
	        var cz;
	        var len;
	        var invLen;
	        var overlap=0;
	        if(sx>hw){
	            sx=hw;
	        }else if(sx<-hw){
	            sx=-hw;
	        }else{
	            overlap=1;
	        }
	        if(sy>hh){
	            sy=hh;
	        }else if(sy<-hh){
	            sy=-hh;
	        }else{
	            overlap|=2;
	        }
	        if(sz>hd){
	            sz=hd;
	        }else if(sz<-hd){
	            sz=-hd;
	        }else{
	            overlap|=4;
	        }
	        if(overlap==7){
	            // center of sphere is in the box
	            if(sx<0){
	                dx=hw+sx;
	            }else{
	                dx=hw-sx;
	            }
	            if(sy<0){
	                dy=hh+sy;
	            }else{
	                dy=hh-sy;
	            }
	            if(sz<0){
	                dz=hd+sz;
	            }else{
	                dz=hd-sz;
	            }
	            if(dx<dy){
	                if(dx<dz){
	                    len=dx-hw;
	                if(sx<0){
	                    sx=-hw;
	                    dx=D[0];
	                    dy=D[1];
	                    dz=D[2];
	                }else{
	                    sx=hw;
	                    dx=-D[0];
	                    dy=-D[1];
	                    dz=-D[2];
	                }
	            }else{
	                len=dz-hd;
	                if(sz<0){
	                    sz=-hd;
	                    dx=D[6];
	                    dy=D[7];
	                    dz=D[8];
	                }else{
	                    sz=hd;
	                    dx=-D[6];
	                    dy=-D[7];
	                    dz=-D[8];
	                }
	            }
	            }else{
	                if(dy<dz){
	                    len=dy-hh;
	                    if(sy<0){
	                        sy=-hh;
	                        dx=D[3];
	                        dy=D[4];
	                        dz=D[5];
	                    }else{
	                        sy=hh;
	                        dx=-D[3];
	                        dy=-D[4];
	                        dz=-D[5];
	                    }
	                }else{
	                    len=dz-hd;
	                    if(sz<0){
	                        sz=-hd;
	                        dx=D[6];
	                        dy=D[7];
	                        dz=D[8];
	                    }else{
	                        sz=hd;
	                        dx=-D[6];
	                        dy=-D[7];
	                        dz=-D[8];
	                }
	            }
	        }
	        cx=pbx+sx*D[0]+sy*D[3]+sz*D[6];
	        cy=pby+sx*D[1]+sy*D[4]+sz*D[7];
	        cz=pbz+sx*D[2]+sy*D[5]+sz*D[8];
	        manifold.addPoint(psx+rad*dx,psy+rad*dy,psz+rad*dz,dx,dy,dz,len-rad,this.flip);
	        }else{
	            cx=pbx+sx*D[0]+sy*D[3]+sz*D[6];
	            cy=pby+sx*D[1]+sy*D[4]+sz*D[7];
	            cz=pbz+sx*D[2]+sy*D[5]+sz*D[8];
	            dx=cx-ps.x;
	            dy=cy-ps.y;
	            dz=cz-ps.z;
	            len=dx*dx+dy*dy+dz*dz;
	            if(len>0&&len<rad*rad){
	                len=_Math.sqrt(len);
	                invLen=1/len;
	                dx*=invLen;
	                dy*=invLen;
	                dz*=invLen;
	                manifold.addPoint(psx+rad*dx,psy+rad*dy,psz+rad*dz,dx,dy,dz,len-rad,this.flip);
	            }
	        }

	    }

	});

	function SphereCylinderCollisionDetector ( flip ){
	    
	    CollisionDetector.call( this );
	    this.flip = flip;

	}

	SphereCylinderCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: SphereCylinderCollisionDetector,

	    detectCollision: function ( shape1, shape2, manifold ) {
	        
	        var s;
	        var c;
	        if( this.flip ){
	            s = shape2;
	            c = shape1;
	        }else{
	            s = shape1;
	            c = shape2;
	        }
	        var ps = s.position;
	        var psx = ps.x;
	        var psy = ps.y;
	        var psz = ps.z;
	        var pc = c.position;
	        var pcx = pc.x;
	        var pcy = pc.y;
	        var pcz = pc.z;
	        var dirx = c.normalDirection.x;
	        var diry = c.normalDirection.y;
	        var dirz = c.normalDirection.z;
	        var rads = s.radius;
	        var radc = c.radius;
	        var rad2 = rads + radc;
	        var halfh = c.halfHeight;
	        var dx = psx - pcx;
	        var dy = psy - pcy;
	        var dz = psz - pcz;
	        var dot = dx * dirx + dy * diry + dz * dirz;
	        if ( dot < -halfh - rads || dot > halfh + rads ) return;
	        var cx = pcx + dot * dirx;
	        var cy = pcy + dot * diry;
	        var cz = pcz + dot * dirz;
	        var d2x = psx - cx;
	        var d2y = psy - cy;
	        var d2z = psz - cz;
	        var len = d2x * d2x + d2y * d2y + d2z * d2z;
	        if ( len > rad2 * rad2 ) return;
	        if ( len > radc * radc ) {
	            len = radc / _Math.sqrt( len );
	            d2x *= len;
	            d2y *= len;
	            d2z *= len;
	        }
	        if( dot < -halfh ) dot = -halfh;
	        else if( dot > halfh ) dot = halfh;
	        cx = pcx + dot * dirx + d2x;
	        cy = pcy + dot * diry + d2y;
	        cz = pcz + dot * dirz + d2z;
	        dx = cx - psx;
	        dy = cy - psy;
	        dz = cz - psz;
	        len = dx * dx + dy * dy + dz * dz;
	        var invLen;
	        if ( len > 0 && len < rads * rads ) {
	            len = _Math.sqrt(len);
	            invLen = 1 / len;
	            dx *= invLen;
	            dy *= invLen;
	            dz *= invLen;
	            ///result.addContactInfo(psx+dx*rads,psy+dy*rads,psz+dz*rads,dx,dy,dz,len-rads,s,c,0,0,false);
	            manifold.addPoint( psx + dx * rads, psy + dy * rads, psz + dz * rads, dx, dy, dz, len - rads, this.flip );
	        }

	    }


	});

	/**
	 * A collision detector which detects collisions between two spheres.
	 * @author saharan
	 */
	 
	function SphereSphereCollisionDetector (){

	    CollisionDetector.call( this );

	}

	SphereSphereCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: SphereSphereCollisionDetector,

	    detectCollision: function ( shape1, shape2, manifold ) {

	        var s1 = shape1;
	        var s2 = shape2;
	        var p1 = s1.position;
	        var p2 = s2.position;
	        var dx = p2.x - p1.x;
	        var dy = p2.y - p1.y;
	        var dz = p2.z - p1.z;
	        var len = dx * dx + dy * dy + dz * dz;
	        var r1 = s1.radius;
	        var r2 = s2.radius;
	        var rad = r1 + r2;
	        if ( len > 0 && len < rad * rad ){
	            len = _Math.sqrt( len );
	            var invLen = 1 / len;
	            dx *= invLen;
	            dy *= invLen;
	            dz *= invLen;
	            manifold.addPoint( p1.x + dx * r1, p1.y + dy * r1, p1.z + dz * r1, dx, dy, dz, len - rad, false );
	        }

	    }

	});

	/**
	 * A collision detector which detects collisions between two spheres.
	 * @author saharan 
	 * @author lo-th
	 */
	 
	function SpherePlaneCollisionDetector ( flip ){

	    CollisionDetector.call( this );

	    this.flip = flip;

	    this.n = new Vec3();
	    this.p = new Vec3();

	}

	SpherePlaneCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: SpherePlaneCollisionDetector,

	    detectCollision: function ( shape1, shape2, manifold ) {

	        var n = this.n;
	        var p = this.p;

	        var s = this.flip ? shape2 : shape1;
	        var pn = this.flip ? shape1 : shape2;
	        var rad = s.radius;
	        var len;

	        n.sub( s.position, pn.position );
	        //var h = _Math.dotVectors( pn.normal, n );

	        n.x *= pn.normal.x;//+ rad;
	        n.y *= pn.normal.y;
	        n.z *= pn.normal.z;//+ rad;

	        
	        var len = n.lengthSq();
	        
	        if( len > 0 && len < rad * rad){//&& h > rad*rad ){

	            
	            len = _Math.sqrt( len );
	            //len = _Math.sqrt( h );
	            n.copy(pn.normal).negate();
	            //n.scaleEqual( 1/len );

	            //(0, -1, 0)

	            //n.normalize();
	            p.copy( s.position ).addScaledVector( n, rad );
	            manifold.addPointVec( p, n, len - rad, this.flip );

	        }

	    }

	});

	/**
	 * A collision detector which detects collisions between two spheres.
	 * @author saharan 
	 * @author lo-th
	 */
	 
	function BoxPlaneCollisionDetector ( flip ){

	    CollisionDetector.call( this );

	    this.flip = flip;

	    this.n = new Vec3();
	    this.p = new Vec3();

	    this.dix = new Vec3();
	    this.diy = new Vec3();
	    this.diz = new Vec3();

	    this.cc = new Vec3();
	    this.cc2 = new Vec3();

	}

	BoxPlaneCollisionDetector.prototype = Object.assign( Object.create( CollisionDetector.prototype ), {

	    constructor: BoxPlaneCollisionDetector,

	    detectCollision: function ( shape1, shape2, manifold ) {

	        var n = this.n;
	        var p = this.p;
	        var cc = this.cc;

	        var b = this.flip ? shape2 : shape1;
	        var pn = this.flip ? shape1 : shape2;

	        var D = b.dimentions;
	        var hw = b.halfWidth;
	        var hh = b.halfHeight;
	        var hd = b.halfDepth;
	        var len;
	        var overlap = 0;

	        this.dix.set( D[0], D[1], D[2] );
	        this.diy.set( D[3], D[4], D[5] );
	        this.diz.set( D[6], D[7], D[8] );

	        n.sub( b.position, pn.position );

	        n.x *= pn.normal.x;//+ rad;
	        n.y *= pn.normal.y;
	        n.z *= pn.normal.z;//+ rad;

	        cc.set(
	            _Math.dotVectors( this.dix, n ),
	            _Math.dotVectors( this.diy, n ),
	            _Math.dotVectors( this.diz, n )
	        );


	        if( cc.x > hw ) cc.x = hw;
	        else if( cc.x < -hw ) cc.x = -hw;
	        else overlap = 1;
	        
	        if( cc.y > hh ) cc.y = hh;
	        else if( cc.y < -hh ) cc.y = -hh;
	        else overlap |= 2;
	        
	        if( cc.z > hd ) cc.z = hd;
	        else if( cc.z < -hd ) cc.z = -hd;
	        else overlap |= 4;

	        

	        if( overlap === 7 ){

	            // center of sphere is in the box
	            
	            n.set(
	                cc.x < 0 ? hw + cc.x : hw - cc.x,
	                cc.y < 0 ? hh + cc.y : hh - cc.y,
	                cc.z < 0 ? hd + cc.z : hd - cc.z
	            );
	            
	            if( n.x < n.y ){
	                if( n.x < n.z ){
	                    len = n.x - hw;
	                    if( cc.x < 0 ){
	                        cc.x = -hw;
	                        n.copy( this.dix );
	                    }else{
	                        cc.x = hw;
	                        n.subEqual( this.dix );
	                    }
	                }else{
	                    len = n.z - hd;
	                    if( cc.z < 0 ){
	                        cc.z = -hd;
	                        n.copy( this.diz );
	                    }else{
	                        cc.z = hd;
	                        n.subEqual( this.diz );
	                    }
	                }
	            }else{
	                if( n.y < n.z ){
	                    len = n.y - hh;
	                    if( cc.y < 0 ){
	                        cc.y = -hh;
	                        n.copy( this.diy );
	                    }else{
	                        cc.y = hh;
	                        n.subEqual( this.diy );
	                    }
	                }else{
	                    len = n.z - hd;
	                    if( cc.z < 0 ){
	                        cc.z = -hd;
	                        n.copy( this.diz );
	                    }else{
	                        cc.z = hd;
	                        n.subEqual( this.diz );
	                    }
	                }
	            }

	            p.copy( pn.position ).addScaledVector( n, 1 );
	            manifold.addPointVec( p, n, len, this.flip );

	        }

	    }

	});

	//import { TetraShape } from '../collision/shape/TetraShape';

	/**
	 * The class of physical computing world.
	 * You must be added to the world physical all computing objects
	 *
	 * @author saharan
	 * @author lo-th
	 */

	 // timestep, broadphase, iterations, worldscale, random, stat

	function World ( o ) {

	    if( !(o instanceof Object) ) o = {};

	    // this world scale defaut is 0.1 to 10 meters max for dynamique body
	    this.scale = o.worldscale || 1;
	    this.invScale = 1/this.scale;

	    // The time between each step
	    this.timeStep = o.timestep || 0.01666; // 1/60;
	    this.timerate = this.timeStep * 1000;
	    this.timer = null;

	    this.preLoop = null;//function(){};
	    this.postLoop = null;//function(){};

	    // The number of iterations for constraint solvers.
	    this.numIterations = o.iterations || 8;

	     // It is a wide-area collision judgment that is used in order to reduce as much as possible a detailed collision judgment.
	    switch( o.broadphase || 2 ){
	        case 1: this.broadPhase = new BruteForceBroadPhase(); break;
	        case 2: default: this.broadPhase = new SAPBroadPhase(); break;
	        case 3: this.broadPhase = new DBVTBroadPhase(); break;
	    }

	    this.Btypes = ['None','BruteForce','Sweep & Prune', 'Bounding Volume Tree' ];
	    this.broadPhaseType = this.Btypes[ o.broadphase || 2 ];

	    // This is the detailed information of the performance.
	    this.performance = null;
	    this.isStat = o.info === undefined ? false : o.info;
	    if( this.isStat ) this.performance = new InfoDisplay( this );

	    /**
	     * Whether the constraints randomizer is enabled or not.
	     *
	     * @property enableRandomizer
	     * @type {Boolean}
	     */
	    this.enableRandomizer = o.random !== undefined ? o.random : true;

	    // The rigid body list
	    this.rigidBodies=null;
	    // number of rigid body
	    this.numRigidBodies=0;
	    // The contact list
	    this.contacts=null;
	    this.unusedContacts=null;
	    // The number of contact
	    this.numContacts=0;
	    // The number of contact points
	    this.numContactPoints=0;
	    //  The joint list
	    this.joints=null;
	    // The number of joints.
	    this.numJoints=0;
	    // The number of simulation islands.
	    this.numIslands=0;


	    // The gravity in the world.
	    this.gravity = new Vec3(0,-9.8,0);
	    if( o.gravity !== undefined ) this.gravity.fromArray( o.gravity );



	    var numShapeTypes = 5;//4;//3;
	    this.detectors=[];
	    this.detectors.length = numShapeTypes;
	    var i = numShapeTypes;
	    while(i--){
	        this.detectors[i]=[];
	        this.detectors[i].length = numShapeTypes;
	    }

	    this.detectors[SHAPE_SPHERE][SHAPE_SPHERE] = new SphereSphereCollisionDetector();
	    this.detectors[SHAPE_SPHERE][SHAPE_BOX] = new SphereBoxCollisionDetector(false);
	    this.detectors[SHAPE_BOX][SHAPE_SPHERE] = new SphereBoxCollisionDetector(true);
	    this.detectors[SHAPE_BOX][SHAPE_BOX] = new BoxBoxCollisionDetector();

	    // CYLINDER add
	    this.detectors[SHAPE_CYLINDER][SHAPE_CYLINDER] = new CylinderCylinderCollisionDetector();

	    this.detectors[SHAPE_CYLINDER][SHAPE_BOX] = new BoxCylinderCollisionDetector(true);
	    this.detectors[SHAPE_BOX][SHAPE_CYLINDER] = new BoxCylinderCollisionDetector(false);

	    this.detectors[SHAPE_CYLINDER][SHAPE_SPHERE] = new SphereCylinderCollisionDetector(true);
	    this.detectors[SHAPE_SPHERE][SHAPE_CYLINDER] = new SphereCylinderCollisionDetector(false);

	    // PLANE add

	    this.detectors[SHAPE_PLANE][SHAPE_SPHERE] = new SpherePlaneCollisionDetector(true);
	    this.detectors[SHAPE_SPHERE][SHAPE_PLANE] = new SpherePlaneCollisionDetector(false);

	    this.detectors[SHAPE_PLANE][SHAPE_BOX] = new BoxPlaneCollisionDetector(true);
	    this.detectors[SHAPE_BOX][SHAPE_PLANE] = new BoxPlaneCollisionDetector(false);

	    // TETRA add
	    //this.detectors[SHAPE_TETRA][SHAPE_TETRA] = new TetraTetraCollisionDetector();


	    this.randX = 65535;
	    this.randA = 98765;
	    this.randB = 123456789;

	    this.islandRigidBodies = [];
	    this.islandStack = [];
	    this.islandConstraints = [];

	}

	Object.assign( World.prototype, {

	    World: true,

	    play: function(){
	 
	        if( this.timer !== null ) return;

	        var _this = this;
	        this.timer = setInterval( function(){ _this.step(); } , this.timerate );
	        //this.timer = setInterval( this.loop.bind(this) , this.timerate );

	    },

	    stop: function(){

	        if( this.timer === null ) return;

	        clearInterval( this.timer );
	        this.timer = null;

	    },

	    setGravity: function ( ar ) {

	        this.gravity.fromArray( ar );

	    },

	    getInfo: function () {

	        return this.isStat ? this.performance.show() : '';

	    },

	    // Reset the world and remove all rigid bodies, shapes, joints and any object from the world.
	    clear:function(){

	        this.stop();
	        this.preLoop = null;
	        this.postLoop = null;

	        this.randX = 65535;

	        while(this.joints!==null){
	            this.removeJoint( this.joints );
	        }
	        while(this.contacts!==null){
	            this.removeContact( this.contacts );
	        }
	        while(this.rigidBodies!==null){
	            this.removeRigidBody( this.rigidBodies );
	        }

	    },
	    /**
	    * I'll add a rigid body to the world.
	    * Rigid body that has been added will be the operands of each step.
	    * @param  rigidBody  Rigid body that you want to add
	    */
	    addRigidBody:function( rigidBody ){

	        if(rigidBody.parent){
	            printError("World", "It is not possible to be added to more than one world one of the rigid body");
	        }

	        rigidBody.setParent( this );
	        //rigidBody.awake();

	        for(var shape = rigidBody.shapes; shape !== null; shape = shape.next){
	            this.addShape( shape );
	        }
	        if(this.rigidBodies!==null)(this.rigidBodies.prev=rigidBody).next=this.rigidBodies;
	        this.rigidBodies = rigidBody;
	        this.numRigidBodies++;

	    },
	    /**
	    * I will remove the rigid body from the world.
	    * Rigid body that has been deleted is excluded from the calculation on a step-by-step basis.
	    * @param  rigidBody  Rigid body to be removed
	    */
	    removeRigidBody:function( rigidBody ){

	        var remove=rigidBody;
	        if(remove.parent!==this)return;
	        remove.awake();
	        var js=remove.jointLink;
	        while(js!=null){
		        var joint=js.joint;
		        js=js.next;
		        this.removeJoint(joint);
	        }
	        for(var shape=rigidBody.shapes; shape!==null; shape=shape.next){
	            this.removeShape(shape);
	        }
	        var prev=remove.prev;
	        var next=remove.next;
	        if(prev!==null) prev.next=next;
	        if(next!==null) next.prev=prev;
	        if(this.rigidBodies==remove) this.rigidBodies=next;
	        remove.prev=null;
	        remove.next=null;
	        remove.parent=null;
	        this.numRigidBodies--;

	    },

	    getByName: function( name ){

	        var body = this.rigidBodies;
	        while( body !== null ){
	            if( body.name === name ) return body;
	            body=body.next;
	        }

	        var joint = this.joints;
	        while( joint !== null ){
	            if( joint.name === name ) return joint;
	            joint = joint.next;
	        }

	        return null;

	    },

	    /**
	    * I'll add a shape to the world..
	    * Add to the rigid world, and if you add a shape to a rigid body that has been added to the world,
	    * Shape will be added to the world automatically, please do not call from outside this method.
	    * @param  shape  Shape you want to add
	    */
	    addShape:function ( shape ){

	        if(!shape.parent || !shape.parent.parent){
	            printError("World", "It is not possible to be added alone to shape world");
	        }

	        shape.proxy = this.broadPhase.createProxy(shape);
	        shape.updateProxy();
	        this.broadPhase.addProxy(shape.proxy);

	    },

	    /**
	    * I will remove the shape from the world.
	    * Add to the rigid world, and if you add a shape to a rigid body that has been added to the world,
	    * Shape will be added to the world automatically, please do not call from outside this method.
	    * @param  shape  Shape you want to delete
	    */
	    removeShape: function ( shape ){

	        this.broadPhase.removeProxy(shape.proxy);
	        shape.proxy = null;

	    },

	    /**
	    * I'll add a joint to the world.
	    * Joint that has been added will be the operands of each step.
	    * @param  shape Joint to be added
	    */
	    addJoint: function ( joint ) {

	        if(joint.parent){
	            printError("World", "It is not possible to be added to more than one world one of the joint");
	        }
	        if(this.joints!=null)(this.joints.prev=joint).next=this.joints;
	        this.joints=joint;
	        joint.setParent( this );
	        this.numJoints++;
	        joint.awake();
	        joint.attach();

	    },

	    /**
	    * I will remove the joint from the world.
	    * Joint that has been added will be the operands of each step.
	    * @param  shape Joint to be deleted
	    */
	    removeJoint: function ( joint ) {

	        var remove=joint;
	        var prev=remove.prev;
	        var next=remove.next;
	        if(prev!==null)prev.next=next;
	        if(next!==null)next.prev=prev;
	        if(this.joints==remove)this.joints=next;
	        remove.prev=null;
	        remove.next=null;
	        this.numJoints--;
	        remove.awake();
	        remove.detach();
	        remove.parent=null;

	    },

	    addContact: function ( s1, s2 ) {

	        var newContact;
	        if(this.unusedContacts!==null){
	            newContact=this.unusedContacts;
	            this.unusedContacts=this.unusedContacts.next;
	        }else{
	            newContact = new Contact();
	        }
	        newContact.attach(s1,s2);
	        newContact.detector = this.detectors[s1.type][s2.type];
	        if(this.contacts)(this.contacts.prev = newContact).next = this.contacts;
	        this.contacts = newContact;
	        this.numContacts++;

	    },

	    removeContact: function ( contact ) {

	        var prev = contact.prev;
	        var next = contact.next;
	        if(next) next.prev = prev;
	        if(prev) prev.next = next;
	        if(this.contacts == contact) this.contacts = next;
	        contact.prev = null;
	        contact.next = null;
	        contact.detach();
	        contact.next = this.unusedContacts;
	        this.unusedContacts = contact;
	        this.numContacts--;

	    },

	    getContact: function ( b1, b2 ) {

	        b1 = b1.constructor === RigidBody ? b1.name : b1;
	        b2 = b2.constructor === RigidBody ? b2.name : b2;

	        var n1, n2;
	        var contact = this.contacts;
	        while(contact!==null){
	            n1 = contact.body1.name;
	            n2 = contact.body2.name;
	            if((n1===b1 && n2===b2) || (n2===b1 && n1===b2)){ if(contact.touching) return contact; else return null;}
	            else contact = contact.next;
	        }
	        return null;

	    },

	    checkContact: function ( name1, name2 ) {

	        var n1, n2;
	        var contact = this.contacts;
	        while(contact!==null){
	            n1 = contact.body1.name || ' ';
	            n2 = contact.body2.name || ' ';
	            if((n1==name1 && n2==name2) || (n2==name1 && n1==name2)){ if(contact.touching) return true; else return false;}
	            else contact = contact.next;
	        }
	        //return false;

	    },

	    callSleep: function( body ) {

	        if( !body.allowSleep ) return false;
	        if( body.linearVelocity.lengthSq() > 0.04 ) return false;
	        if( body.angularVelocity.lengthSq() > 0.25 ) return false;
	        return true;

	    },

	    /**
	    * I will proceed only time step seconds time of World.
	    */
	    step: function () {

	        var stat = this.isStat;

	        if( stat ) this.performance.setTime( 0 );

	        var body = this.rigidBodies;

	        while( body !== null ){

	            body.addedToIsland = false;

	            if( body.sleeping ) body.testWakeUp();

	            body = body.next;

	        }



	        //------------------------------------------------------
	        //   UPDATE BROADPHASE CONTACT
	        //------------------------------------------------------

	        if( stat ) this.performance.setTime( 1 );

	        this.broadPhase.detectPairs();

	        var pairs = this.broadPhase.pairs;

	        var i = this.broadPhase.numPairs;
	        //do{
	        while(i--){
	        //for(var i=0, l=numPairs; i<l; i++){
	            var pair = pairs[i];
	            var s1;
	            var s2;
	            if(pair.shape1.id<pair.shape2.id){
	                s1 = pair.shape1;
	                s2 = pair.shape2;
	            }else{
	                s1 = pair.shape2;
	                s2 = pair.shape1;
	            }

	            var link;
	            if( s1.numContacts < s2.numContacts ) link = s1.contactLink;
	            else link = s2.contactLink;

	            var exists = false;
	            while(link){
	                var contact = link.contact;
	                if( contact.shape1 == s1 && contact.shape2 == s2 ){
	                    contact.persisting = true;
	                    exists = true;// contact already exists
	                    break;
	                }
	                link = link.next;
	            }
	            if(!exists){
	                this.addContact( s1, s2 );
	            }
	        }// while(i-- >0);

	        if( stat ) this.performance.calcBroadPhase();

	        //------------------------------------------------------
	        //   UPDATE NARROWPHASE CONTACT
	        //------------------------------------------------------

	        // update & narrow phase
	        this.numContactPoints = 0;
	        contact = this.contacts;
	        while( contact!==null ){
	            if(!contact.persisting){
	                if ( contact.shape1.aabb.intersectTest( contact.shape2.aabb ) ) {
	                /*var aabb1=contact.shape1.aabb;
	                var aabb2=contact.shape2.aabb;
	                if(
		                aabb1.minX>aabb2.maxX || aabb1.maxX<aabb2.minX ||
		                aabb1.minY>aabb2.maxY || aabb1.maxY<aabb2.minY ||
		                aabb1.minZ>aabb2.maxZ || aabb1.maxZ<aabb2.minZ
	                ){*/
	                    var next = contact.next;
	                    this.removeContact(contact);
	                    contact = next;
	                    continue;
	                }
	            }
	            var b1 = contact.body1;
	            var b2 = contact.body2;

	            if( b1.isDynamic && !b1.sleeping || b2.isDynamic && !b2.sleeping ) contact.updateManifold();

	            this.numContactPoints += contact.manifold.numPoints;
	            contact.persisting = false;
	            contact.constraint.addedToIsland = false;
	            contact = contact.next;

	        }

	        if( stat ) this.performance.calcNarrowPhase();

	        //------------------------------------------------------
	        //   SOLVE ISLANDS
	        //------------------------------------------------------

	        var invTimeStep = 1 / this.timeStep;
	        var joint;
	        var constraint;

	        for( joint = this.joints; joint !== null; joint = joint.next ){
	            joint.addedToIsland = false;
	        }


	        // clear old island array
	        this.islandRigidBodies = [];
	        this.islandConstraints = [];
	        this.islandStack = [];

	        if( stat ) this.performance.setTime( 1 );

	        this.numIslands = 0;

	        // build and solve simulation islands

	        for( var base = this.rigidBodies; base !== null; base = base.next ){

	            if( base.addedToIsland || base.isStatic || base.sleeping ) continue;// ignore

	            if( base.isLonely() ){// update single body
	                if( base.isDynamic ){
	                    base.linearVelocity.addScaledVector( this.gravity, this.timeStep );
	                    /*base.linearVelocity.x+=this.gravity.x*this.timeStep;
	                    base.linearVelocity.y+=this.gravity.y*this.timeStep;
	                    base.linearVelocity.z+=this.gravity.z*this.timeStep;*/
	                }
	                if( this.callSleep( base ) ) {
	                    base.sleepTime += this.timeStep;
	                    if( base.sleepTime > 0.5 ) base.sleep();
	                    else base.updatePosition( this.timeStep );
	                }else{
	                    base.sleepTime = 0;
	                    base.updatePosition( this.timeStep );
	                }
	                this.numIslands++;
	                continue;
	            }

	            var islandNumRigidBodies = 0;
	            var islandNumConstraints = 0;
	            var stackCount = 1;
	            // add rigid body to stack
	            this.islandStack[0] = base;
	            base.addedToIsland = true;

	            // build an island
	            do{
	                // get rigid body from stack
	                body = this.islandStack[--stackCount];
	                this.islandStack[stackCount] = null;
	                body.sleeping = false;
	                // add rigid body to the island
	                this.islandRigidBodies[islandNumRigidBodies++] = body;
	                if(body.isStatic) continue;

	                // search connections
	                for( var cs = body.contactLink; cs !== null; cs = cs.next ) {
	                    var contact = cs.contact;
	                    constraint = contact.constraint;
	                    if( constraint.addedToIsland || !contact.touching ) continue;// ignore

	                    // add constraint to the island
	                    this.islandConstraints[islandNumConstraints++] = constraint;
	                    constraint.addedToIsland = true;
	                    var next = cs.body;

	                    if(next.addedToIsland) continue;

	                    // add rigid body to stack
	                    this.islandStack[stackCount++] = next;
	                    next.addedToIsland = true;
	                }
	                for( var js = body.jointLink; js !== null; js = js.next ) {
	                    constraint = js.joint;

	                    if(constraint.addedToIsland) continue;// ignore

	                    // add constraint to the island
	                    this.islandConstraints[islandNumConstraints++] = constraint;
	                    constraint.addedToIsland = true;
	                    next = js.body;
	                    if( next.addedToIsland || !next.isDynamic ) continue;

	                    // add rigid body to stack
	                    this.islandStack[stackCount++] = next;
	                    next.addedToIsland = true;
	                }
	            } while( stackCount != 0 );

	            // update velocities
	            var gVel = new Vec3().addScaledVector( this.gravity, this.timeStep );
	            /*var gx=this.gravity.x*this.timeStep;
	            var gy=this.gravity.y*this.timeStep;
	            var gz=this.gravity.z*this.timeStep;*/
	            var j = islandNumRigidBodies;
	            while (j--){
	            //or(var j=0, l=islandNumRigidBodies; j<l; j++){
	                body = this.islandRigidBodies[j];
	                if(body.isDynamic){
	                    body.linearVelocity.addEqual(gVel);
	                    /*body.linearVelocity.x+=gx;
	                    body.linearVelocity.y+=gy;
	                    body.linearVelocity.z+=gz;*/
	                }
	            }

	            // randomizing order
	            if(this.enableRandomizer){
	                //for(var j=1, l=islandNumConstraints; j<l; j++){
	                j = islandNumConstraints;
	                while(j--){ if(j!==0){
	                        var swap = (this.randX=(this.randX*this.randA+this.randB&0x7fffffff))/2147483648.0*j|0;
	                        constraint = this.islandConstraints[j];
	                        this.islandConstraints[j] = this.islandConstraints[swap];
	                        this.islandConstraints[swap] = constraint;
	                    }
	                }
	            }

	            // solve contraints

	            j = islandNumConstraints;
	            while(j--){
	            //for(j=0, l=islandNumConstraints; j<l; j++){
	                this.islandConstraints[j].preSolve( this.timeStep, invTimeStep );// pre-solve
	            }
	            var k = this.numIterations;
	            while(k--){
	            //for(var k=0, l=this.numIterations; k<l; k++){
	                j = islandNumConstraints;
	                while(j--){
	                //for(j=0, m=islandNumConstraints; j<m; j++){
	                    this.islandConstraints[j].solve();// main-solve
	                }
	            }
	            j = islandNumConstraints;
	            while(j--){
	            //for(j=0, l=islandNumConstraints; j<l; j++){
	                this.islandConstraints[j].postSolve();// post-solve
	                this.islandConstraints[j] = null;// gc
	            }

	            // sleeping check

	            var sleepTime = 10;
	            j = islandNumRigidBodies;
	            while(j--){
	            //for(j=0, l=islandNumRigidBodies;j<l;j++){
	                body = this.islandRigidBodies[j];
	                if( this.callSleep( body ) ){
	                    body.sleepTime += this.timeStep;
	                    if( body.sleepTime < sleepTime ) sleepTime = body.sleepTime;
	                }else{
	                    body.sleepTime = 0;
	                    sleepTime = 0;
	                    continue;
	                }
	            }
	            if(sleepTime > 0.5){
	                // sleep the island
	                j = islandNumRigidBodies;
	                while(j--){
	                //for(j=0, l=islandNumRigidBodies;j<l;j++){
	                    this.islandRigidBodies[j].sleep();
	                    this.islandRigidBodies[j] = null;// gc
	                }
	            }else{
	                // update positions
	                j = islandNumRigidBodies;
	                while(j--){
	                //for(j=0, l=islandNumRigidBodies;j<l;j++){
	                    this.islandRigidBodies[j].updatePosition( this.timeStep );
	                    this.islandRigidBodies[j] = null;// gc
	                }
	            }
	            this.numIslands++;
	        }

	        //------------------------------------------------------
	        //   END SIMULATION
	        //------------------------------------------------------

	        if( stat ) this.performance.calcEnd();

	        if( this.postLoop !== null ) this.postLoop();

	    },

	    // remove someting to world

	    remove: function( obj ){

	    },

	    // add someting to world
	    
	    add: function( o ){

	        o = o || {};

	        var type = o.type || "box";
	        if( type.constructor === String ) type = [ type ];
	        var isJoint = type[0].substring( 0, 5 ) === 'joint' ? true : false;

	        if( isJoint ) return this.initJoint( type[0], o );
	        else return this.initBody( type, o );

	    },

	    initBody: function( type, o ){

	        var invScale = this.invScale;

	        // body dynamic or static
	        var move = o.move || false;
	        var kinematic = o.kinematic || false;

	        // POSITION

	        // body position
	        var p = o.pos || [0,0,0];
	        p = p.map( function(x) { return x * invScale; } );

	        // shape position
	        var p2 = o.posShape || [0,0,0];
	        p2 = p2.map( function(x) { return x * invScale; } );

	        // ROTATION

	        // body rotation in degree
	        var r = o.rot || [0,0,0];
	        r = r.map( function(x) { return x * _Math.degtorad; } );

	        // shape rotation in degree
	        var r2 = o.rotShape || [0,0,0];
	        r2 = r.map( function(x) { return x * _Math.degtorad; } );

	        // SIZE

	        // shape size
	        var s = o.size === undefined ? [1,1,1] : o.size;
	        if( s.length === 1 ){ s[1] = s[0]; }
	        if( s.length === 2 ){ s[2] = s[0]; }
	        s = s.map( function(x) { return x * invScale; } );

	        

	        // body physics settings
	        var sc = new ShapeConfig();
	        // The density of the shape.
	        if( o.density !== undefined ) sc.density = o.density;
	        // The coefficient of friction of the shape.
	        if( o.friction !== undefined ) sc.friction = o.friction;
	        // The coefficient of restitution of the shape.
	        if( o.restitution !== undefined ) sc.restitution = o.restitution;
	        // The bits of the collision groups to which the shape belongs.
	        if( o.belongsTo !== undefined ) sc.belongsTo = o.belongsTo;
	        // The bits of the collision groups with which the shape collides.
	        if( o.collidesWith !== undefined ) sc.collidesWith = o.collidesWith;

	        if(o.config !== undefined ){
	            if( o.config[0] !== undefined ) sc.density = o.config[0];
	            if( o.config[1] !== undefined ) sc.friction = o.config[1];
	            if( o.config[2] !== undefined ) sc.restitution = o.config[2];
	            if( o.config[3] !== undefined ) sc.belongsTo = o.config[3];
	            if( o.config[4] !== undefined ) sc.collidesWith = o.config[4];
	        }


	       /* if(o.massPos){
	            o.massPos = o.massPos.map(function(x) { return x * invScale; });
	            sc.relativePosition.set( o.massPos[0], o.massPos[1], o.massPos[2] );
	        }
	        if(o.massRot){
	            o.massRot = o.massRot.map(function(x) { return x * _Math.degtorad; });
	            var q = new Quat().setFromEuler( o.massRot[0], o.massRot[1], o.massRot[2] );
	            sc.relativeRotation = new Mat33().setQuat( q );//_Math.EulerToMatrix( o.massRot[0], o.massRot[1], o.massRot[2] );
	        }*/

	        var position = new Vec3( p[0], p[1], p[2] );
	        var rotation = new Quat().setFromEuler( r[0], r[1], r[2] );

	        // rigidbody
	        var body = new RigidBody( position, rotation );
	        //var body = new RigidBody( p[0], p[1], p[2], r[0], r[1], r[2], r[3], this.scale, this.invScale );

	        // SHAPES

	        var shape, n;

	        for( var i = 0; i < type.length; i++ ){

	            n = i * 3;

	            if( p2[n] !== undefined ) sc.relativePosition.set( p2[n], p2[n+1], p2[n+2] );
	            if( r2[n] !== undefined ) sc.relativeRotation.setQuat( new Quat().setFromEuler( r2[n], r2[n+1], r2[n+2] ) );
	            
	            switch( type[i] ){
	                case "sphere": shape = new Sphere( sc, s[n] ); break;
	                case "cylinder": shape = new Cylinder( sc, s[n], s[n+1] ); break;
	                case "box": shape = new Box( sc, s[n], s[n+1], s[n+2] ); break;
	                case "plane": shape = new Plane( sc ); break
	            }

	            body.addShape( shape );
	            
	        }

	        // body can sleep or not
	        if( o.neverSleep || kinematic) body.allowSleep = false;
	        else body.allowSleep = true;

	        body.isKinematic = kinematic;

	        // body static or dynamic
	        if( move ){

	            if(o.massPos || o.massRot) body.setupMass( BODY_DYNAMIC, false );
	            else body.setupMass( BODY_DYNAMIC, true );

	            // body can sleep or not
	            //if( o.neverSleep ) body.allowSleep = false;
	            //else body.allowSleep = true;

	        } else {

	            body.setupMass( BODY_STATIC );

	        }

	        if( o.name !== undefined ) body.name = o.name;
	        //else if( move ) body.name = this.numRigidBodies;

	        // finaly add to physics world
	        this.addRigidBody( body );

	        // force sleep on not
	        if( move ){
	            if( o.sleep ) body.sleep();
	            else body.awake();
	        }

	        return body;


	    },

	    initJoint: function( type, o ){

	        //var type = type;
	        var invScale = this.invScale;

	        var axe1 = o.axe1 || [1,0,0];
	        var axe2 = o.axe2 || [1,0,0];
	        var pos1 = o.pos1 || [0,0,0];
	        var pos2 = o.pos2 || [0,0,0];

	        pos1 = pos1.map(function(x){ return x * invScale; });
	        pos2 = pos2.map(function(x){ return x * invScale; });

	        var min, max;
	        if( type === "jointDistance" ){
	            min = o.min || 0;
	            max = o.max || 10;
	            min = min * invScale;
	            max = max * invScale;
	        }else{
	            min = o.min || 57.29578;
	            max = o.max || 0;
	            min = min * _Math.degtorad;
	            max = max * _Math.degtorad;
	        }

	        var limit = o.limit || null;
	        var spring = o.spring || null;
	        var motor = o.motor || null;

	        // joint setting
	        var jc = new JointConfig();
	        jc.scale = this.scale;
	        jc.invScale = this.invScale;
	        jc.allowCollision = o.collision || false;
	        jc.localAxis1.set( axe1[0], axe1[1], axe1[2] );
	        jc.localAxis2.set( axe2[0], axe2[1], axe2[2] );
	        jc.localAnchorPoint1.set( pos1[0], pos1[1], pos1[2] );
	        jc.localAnchorPoint2.set( pos2[0], pos2[1], pos2[2] );

	        var b1 = null;
	        var b2 = null;

	        if( o.body1 === undefined || o.body2 === undefined ) return printError('World', "Can't add joint if attach rigidbodys not define !" );

	        if ( o.body1.constructor === String ) { b1 = this.getByName( o.body1 ); }
	        else if ( o.body1.constructor === Number ) { b1 = this.getByName( o.body1 ); }
	        else if ( o.body1.constructor === RigidBody ) { b1 = o.body1; }

	        if ( o.body2.constructor === String ) { b2 = this.getByName( o.body2 ); }
	        else if ( o.body2.constructor === Number ) { b2 = this.getByName( o.body2 ); }
	        else if ( o.body2.constructor === RigidBody ) { b2 = o.body2; }

	        if( b1 === null || b2 === null ) return printError('World', "Can't add joint attach rigidbodys not find !" );

	        jc.body1 = b1;
	        jc.body2 = b2;

	        var joint;
	        switch( type ){
	            case "jointDistance": joint = new DistanceJoint(jc, min, max);
	                if(spring !== null) joint.limitMotor.setSpring( spring[0], spring[1] );
	                if(motor !== null) joint.limitMotor.setMotor( motor[0], motor[1] );
	            break;
	            case "jointHinge": case "joint": joint = new HingeJoint(jc, min, max);
	                if(spring !== null) joint.limitMotor.setSpring( spring[0], spring[1] );// soften the joint ex: 100, 0.2
	                if(motor !== null) joint.limitMotor.setMotor( motor[0], motor[1] );
	            break;
	            case "jointPrisme": joint = new PrismaticJoint(jc, min, max); break;
	            case "jointSlide": joint = new SliderJoint(jc, min, max); break;
	            case "jointBall": joint = new BallAndSocketJoint(jc); break;
	            case "jointWheel": joint = new WheelJoint(jc);
	                if(limit !== null) joint.rotationalLimitMotor1.setLimit( limit[0], limit[1] );
	                if(spring !== null) joint.rotationalLimitMotor1.setSpring( spring[0], spring[1] );
	                if(motor !== null) joint.rotationalLimitMotor1.setMotor( motor[0], motor[1] );
	            break;
	        }

	        joint.name = o.name || '';
	        // finaly add to physics world
	        this.addJoint( joint );

	        return joint;

	    },


	} );

	// test version

	//export { RigidBody } from './core/RigidBody_X.js';
	//export { World } from './core/World_X.js';

	exports.Math = _Math;
	exports.Vec3 = Vec3;
	exports.Quat = Quat;
	exports.Mat33 = Mat33;
	exports.Shape = Shape;
	exports.Box = Box;
	exports.Sphere = Sphere;
	exports.Cylinder = Cylinder;
	exports.Plane = Plane;
	exports.Particle = Particle;
	exports.ShapeConfig = ShapeConfig;
	exports.LimitMotor = LimitMotor;
	exports.HingeJoint = HingeJoint;
	exports.BallAndSocketJoint = BallAndSocketJoint;
	exports.DistanceJoint = DistanceJoint;
	exports.PrismaticJoint = PrismaticJoint;
	exports.SliderJoint = SliderJoint;
	exports.WheelJoint = WheelJoint;
	exports.JointConfig = JointConfig;
	exports.RigidBody = RigidBody;
	exports.World = World;
	exports.REVISION = REVISION;
	exports.BR_NULL = BR_NULL;
	exports.BR_BRUTE_FORCE = BR_BRUTE_FORCE;
	exports.BR_SWEEP_AND_PRUNE = BR_SWEEP_AND_PRUNE;
	exports.BR_BOUNDING_VOLUME_TREE = BR_BOUNDING_VOLUME_TREE;
	exports.BODY_NULL = BODY_NULL;
	exports.BODY_DYNAMIC = BODY_DYNAMIC;
	exports.BODY_STATIC = BODY_STATIC;
	exports.BODY_KINEMATIC = BODY_KINEMATIC;
	exports.BODY_GHOST = BODY_GHOST;
	exports.SHAPE_NULL = SHAPE_NULL;
	exports.SHAPE_SPHERE = SHAPE_SPHERE;
	exports.SHAPE_BOX = SHAPE_BOX;
	exports.SHAPE_CYLINDER = SHAPE_CYLINDER;
	exports.SHAPE_PLANE = SHAPE_PLANE;
	exports.SHAPE_PARTICLE = SHAPE_PARTICLE;
	exports.SHAPE_TETRA = SHAPE_TETRA;
	exports.JOINT_NULL = JOINT_NULL;
	exports.JOINT_DISTANCE = JOINT_DISTANCE;
	exports.JOINT_BALL_AND_SOCKET = JOINT_BALL_AND_SOCKET;
	exports.JOINT_HINGE = JOINT_HINGE;
	exports.JOINT_WHEEL = JOINT_WHEEL;
	exports.JOINT_SLIDER = JOINT_SLIDER;
	exports.JOINT_PRISMATIC = JOINT_PRISMATIC;
	exports.AABB_PROX = AABB_PROX;
	exports.printError = printError;
	exports.InfoDisplay = InfoDisplay;

	Object.defineProperty(exports, '__esModule', { value: true });

})));


!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("babylonjs")):"function"==typeof define&&define.amd?define("babylonjs-gui",["babylonjs"],e):"object"==typeof exports?exports["babylonjs-gui"]=e(require("babylonjs")):(t.BABYLON=t.BABYLON||{},t.BABYLON.GUI=e(t.BABYLON))}(window,function(t){return function(t){var e={};function i(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,i),o.l=!0,o.exports}return i.m=t,i.c=e,i.d=function(t,e,r){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(i.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)i.d(r,o,function(e){return t[e]}.bind(null,o));return r},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=27)}([function(e,i){e.exports=t},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(2),o=i(0),n=i(7),s=i(17),a=function(){function t(e){this.name=e,this._alpha=1,this._alphaSet=!1,this._zIndex=0,this._currentMeasure=n.Measure.Empty(),this._fontFamily="Arial",this._fontStyle="",this._fontWeight="",this._fontSize=new r.ValueAndUnit(18,r.ValueAndUnit.UNITMODE_PIXEL,!1),this._width=new r.ValueAndUnit(1,r.ValueAndUnit.UNITMODE_PERCENTAGE,!1),this._height=new r.ValueAndUnit(1,r.ValueAndUnit.UNITMODE_PERCENTAGE,!1),this._color="",this._style=null,this._horizontalAlignment=t.HORIZONTAL_ALIGNMENT_CENTER,this._verticalAlignment=t.VERTICAL_ALIGNMENT_CENTER,this._isDirty=!0,this._tempParentMeasure=n.Measure.Empty(),this._cachedParentMeasure=n.Measure.Empty(),this._paddingLeft=new r.ValueAndUnit(0),this._paddingRight=new r.ValueAndUnit(0),this._paddingTop=new r.ValueAndUnit(0),this._paddingBottom=new r.ValueAndUnit(0),this._left=new r.ValueAndUnit(0),this._top=new r.ValueAndUnit(0),this._scaleX=1,this._scaleY=1,this._rotation=0,this._transformCenterX=.5,this._transformCenterY=.5,this._transformMatrix=s.Matrix2D.Identity(),this._invertTransformMatrix=s.Matrix2D.Identity(),this._transformedPosition=o.Vector2.Zero(),this._onlyMeasureMode=!1,this._isMatrixDirty=!0,this._isVisible=!0,this._fontSet=!1,this._dummyVector2=o.Vector2.Zero(),this._downCount=0,this._enterCount=-1,this._doNotRender=!1,this._downPointerIds={},this._isEnabled=!0,this._disabledColor="#9a9a9a",this.isHitTestVisible=!0,this.isPointerBlocker=!1,this.isFocusInvisible=!1,this.shadowOffsetX=0,this.shadowOffsetY=0,this.shadowBlur=0,this.shadowColor="#000",this.hoverCursor="",this._linkOffsetX=new r.ValueAndUnit(0),this._linkOffsetY=new r.ValueAndUnit(0),this.onPointerMoveObservable=new o.Observable,this.onPointerOutObservable=new o.Observable,this.onPointerDownObservable=new o.Observable,this.onPointerUpObservable=new o.Observable,this.onPointerClickObservable=new o.Observable,this.onPointerEnterObservable=new o.Observable,this.onDirtyObservable=new o.Observable,this.onAfterDrawObservable=new o.Observable}return Object.defineProperty(t.prototype,"typeName",{get:function(){return this._getTypeName()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontOffset",{get:function(){return this._fontOffset},set:function(t){this._fontOffset=t},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"alpha",{get:function(){return this._alpha},set:function(t){this._alpha!==t&&(this._alphaSet=!0,this._alpha=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaleX",{get:function(){return this._scaleX},set:function(t){this._scaleX!==t&&(this._scaleX=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaleY",{get:function(){return this._scaleY},set:function(t){this._scaleY!==t&&(this._scaleY=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"rotation",{get:function(){return this._rotation},set:function(t){this._rotation!==t&&(this._rotation=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"transformCenterY",{get:function(){return this._transformCenterY},set:function(t){this._transformCenterY!==t&&(this._transformCenterY=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"transformCenterX",{get:function(){return this._transformCenterX},set:function(t){this._transformCenterX!==t&&(this._transformCenterX=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"horizontalAlignment",{get:function(){return this._horizontalAlignment},set:function(t){this._horizontalAlignment!==t&&(this._horizontalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"verticalAlignment",{get:function(){return this._verticalAlignment},set:function(t){this._verticalAlignment!==t&&(this._verticalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._width.toString(this._host)!==t&&this._width.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"widthInPixels",{get:function(){return this._width.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"height",{get:function(){return this._height.toString(this._host)},set:function(t){this._height.toString(this._host)!==t&&this._height.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"heightInPixels",{get:function(){return this._height.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontFamily",{get:function(){return this._fontFamily},set:function(t){this._fontFamily!==t&&(this._fontFamily=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontStyle",{get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontWeight",{get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"style",{get:function(){return this._style},set:function(t){var e=this;this._style&&(this._style.onChangedObservable.remove(this._styleObserver),this._styleObserver=null),this._style=t,this._style&&(this._styleObserver=this._style.onChangedObservable.add(function(){e._markAsDirty(),e._resetFontCache()})),this._markAsDirty(),this._resetFontCache()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"_isFontSizeInPercentage",{get:function(){return this._fontSize.isPercentage},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontSizeInPixels",{get:function(){var t=this._style?this._style._fontSize:this._fontSize;return t.isPixel?t.getValue(this._host):t.getValueInPixel(this._host,this._tempParentMeasure.height||this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontSize",{get:function(){return this._fontSize.toString(this._host)},set:function(t){this._fontSize.toString(this._host)!==t&&this._fontSize.fromString(t)&&(this._markAsDirty(),this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"color",{get:function(){return this._color},set:function(t){this._color!==t&&(this._color=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"zIndex",{get:function(){return this._zIndex},set:function(t){this.zIndex!==t&&(this._zIndex=t,this._root&&this._root._reOrderControl(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"notRenderable",{get:function(){return this._doNotRender},set:function(t){this._doNotRender!==t&&(this._doNotRender=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isVisible",{get:function(){return this._isVisible},set:function(t){this._isVisible!==t&&(this._isVisible=t,this._markAsDirty(!0))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isDirty",{get:function(){return this._isDirty},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkedMesh",{get:function(){return this._linkedMesh},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingLeft",{get:function(){return this._paddingLeft.toString(this._host)},set:function(t){this._paddingLeft.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingLeftInPixels",{get:function(){return this._paddingLeft.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingRight",{get:function(){return this._paddingRight.toString(this._host)},set:function(t){this._paddingRight.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingRightInPixels",{get:function(){return this._paddingRight.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingTop",{get:function(){return this._paddingTop.toString(this._host)},set:function(t){this._paddingTop.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingTopInPixels",{get:function(){return this._paddingTop.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingBottom",{get:function(){return this._paddingBottom.toString(this._host)},set:function(t){this._paddingBottom.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingBottomInPixels",{get:function(){return this._paddingBottom.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"left",{get:function(){return this._left.toString(this._host)},set:function(t){this._left.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"leftInPixels",{get:function(){return this._left.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"top",{get:function(){return this._top.toString(this._host)},set:function(t){this._top.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"topInPixels",{get:function(){return this._top.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetX",{get:function(){return this._linkOffsetX.toString(this._host)},set:function(t){this._linkOffsetX.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetXInPixels",{get:function(){return this._linkOffsetX.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetY",{get:function(){return this._linkOffsetY.toString(this._host)},set:function(t){this._linkOffsetY.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetYInPixels",{get:function(){return this._linkOffsetY.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"centerX",{get:function(){return this._currentMeasure.left+this._currentMeasure.width/2},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"centerY",{get:function(){return this._currentMeasure.top+this._currentMeasure.height/2},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isEnabled",{get:function(){return this._isEnabled},set:function(t){this._isEnabled!==t&&(this._isEnabled=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"disabledColor",{get:function(){return this._disabledColor},set:function(t){this._disabledColor!==t&&(this._disabledColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),t.prototype._getTypeName=function(){return"Control"},t.prototype._resetFontCache=function(){this._fontSet=!0,this._markAsDirty()},t.prototype.isAscendant=function(t){return!!this.parent&&(this.parent===t||this.parent.isAscendant(t))},t.prototype.getLocalCoordinates=function(t){var e=o.Vector2.Zero();return this.getLocalCoordinatesToRef(t,e),e},t.prototype.getLocalCoordinatesToRef=function(t,e){return e.x=t.x-this._currentMeasure.left,e.y=t.y-this._currentMeasure.top,this},t.prototype.getParentLocalCoordinates=function(t){var e=o.Vector2.Zero();return e.x=t.x-this._cachedParentMeasure.left,e.y=t.y-this._cachedParentMeasure.top,e},t.prototype.moveToVector3=function(e,i){if(this._host&&this._root===this._host._rootContainer){this.horizontalAlignment=t.HORIZONTAL_ALIGNMENT_LEFT,this.verticalAlignment=t.VERTICAL_ALIGNMENT_TOP;var r=this._host._getGlobalViewport(i),n=o.Vector3.Project(e,o.Matrix.Identity(),i.getTransformMatrix(),r);this._moveToProjectedPosition(n),n.z<0||n.z>1?this.notRenderable=!0:this.notRenderable=!1}else o.Tools.Error("Cannot move a control to a vector3 if the control is not at root level")},t.prototype.linkWithMesh=function(e){if(!this._host||this._root&&this._root!==this._host._rootContainer)e&&o.Tools.Error("Cannot link a control to a mesh if the control is not at root level");else{var i=this._host._linkedControls.indexOf(this);if(-1!==i)return this._linkedMesh=e,void(e||this._host._linkedControls.splice(i,1));e&&(this.horizontalAlignment=t.HORIZONTAL_ALIGNMENT_LEFT,this.verticalAlignment=t.VERTICAL_ALIGNMENT_TOP,this._linkedMesh=e,this._onlyMeasureMode=0===this._currentMeasure.width||0===this._currentMeasure.height,this._host._linkedControls.push(this))}},t.prototype._moveToProjectedPosition=function(t){var e=this._left.getValue(this._host),i=this._top.getValue(this._host),r=t.x+this._linkOffsetX.getValue(this._host)-this._currentMeasure.width/2,o=t.y+this._linkOffsetY.getValue(this._host)-this._currentMeasure.height/2;this._left.ignoreAdaptiveScaling&&this._top.ignoreAdaptiveScaling&&(Math.abs(r-e)<.5&&(r=e),Math.abs(o-i)<.5&&(o=i)),this.left=r+"px",this.top=o+"px",this._left.ignoreAdaptiveScaling=!0,this._top.ignoreAdaptiveScaling=!0},t.prototype._markMatrixAsDirty=function(){this._isMatrixDirty=!0,this._flagDescendantsAsMatrixDirty()},t.prototype._flagDescendantsAsMatrixDirty=function(){},t.prototype._markAsDirty=function(t){void 0===t&&(t=!1),(this._isVisible||t)&&(this._isDirty=!0,this._host&&this._host.markAsDirty())},t.prototype._markAllAsDirty=function(){this._markAsDirty(),this._font&&this._prepareFont()},t.prototype._link=function(t,e){this._root=t,this._host=e},t.prototype._transform=function(t){if(this._isMatrixDirty||1!==this._scaleX||1!==this._scaleY||0!==this._rotation){var e=this._currentMeasure.width*this._transformCenterX+this._currentMeasure.left,i=this._currentMeasure.height*this._transformCenterY+this._currentMeasure.top;t.translate(e,i),t.rotate(this._rotation),t.scale(this._scaleX,this._scaleY),t.translate(-e,-i),(this._isMatrixDirty||this._cachedOffsetX!==e||this._cachedOffsetY!==i)&&(this._cachedOffsetX=e,this._cachedOffsetY=i,this._isMatrixDirty=!1,this._flagDescendantsAsMatrixDirty(),s.Matrix2D.ComposeToRef(-e,-i,this._rotation,this._scaleX,this._scaleY,this._root?this._root._transformMatrix:null,this._transformMatrix),this._transformMatrix.invertToRef(this._invertTransformMatrix))}},t.prototype._applyStates=function(t){this._isFontSizeInPercentage&&(this._fontSet=!0),this._fontSet&&(this._prepareFont(),this._fontSet=!1),this._font&&(t.font=this._font),this._color&&(t.fillStyle=this._color),this._alphaSet&&(t.globalAlpha=this.parent?this.parent.alpha*this._alpha:this._alpha)},t.prototype._processMeasures=function(t,e){return!this._isDirty&&this._cachedParentMeasure.isEqualsTo(t)||(this._isDirty=!1,this._currentMeasure.copyFrom(t),this._preMeasure(t,e),this._measure(),this._computeAlignment(t,e),this._currentMeasure.left=0|this._currentMeasure.left,this._currentMeasure.top=0|this._currentMeasure.top,this._currentMeasure.width=0|this._currentMeasure.width,this._currentMeasure.height=0|this._currentMeasure.height,this._additionalProcessing(t,e),this._cachedParentMeasure.copyFrom(t),this.onDirtyObservable.hasObservers()&&this.onDirtyObservable.notifyObservers(this)),!(this._currentMeasure.left>t.left+t.width)&&(!(this._currentMeasure.left+this._currentMeasure.width<t.left)&&(!(this._currentMeasure.top>t.top+t.height)&&(!(this._currentMeasure.top+this._currentMeasure.height<t.top)&&(this._transform(e),this._onlyMeasureMode?(this._onlyMeasureMode=!1,!1):(this._clip(e),e.clip(),!0)))))},t.prototype._clip=function(t){if(t.beginPath(),this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY){var e=this.shadowOffsetX,i=this.shadowOffsetY,r=this.shadowBlur,o=Math.min(Math.min(e,0)-2*r,0),n=Math.max(Math.max(e,0)+2*r,0),s=Math.min(Math.min(i,0)-2*r,0),a=Math.max(Math.max(i,0)+2*r,0);t.rect(this._currentMeasure.left+o,this._currentMeasure.top+s,this._currentMeasure.width+n-o,this._currentMeasure.height+a-s)}else t.rect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)},t.prototype._measure=function(){this._width.isPixel?this._currentMeasure.width=this._width.getValue(this._host):this._currentMeasure.width*=this._width.getValue(this._host),this._height.isPixel?this._currentMeasure.height=this._height.getValue(this._host):this._currentMeasure.height*=this._height.getValue(this._host)},t.prototype._computeAlignment=function(e,i){var r=this._currentMeasure.width,o=this._currentMeasure.height,n=e.width,s=e.height,a=0,h=0;switch(this.horizontalAlignment){case t.HORIZONTAL_ALIGNMENT_LEFT:a=0;break;case t.HORIZONTAL_ALIGNMENT_RIGHT:a=n-r;break;case t.HORIZONTAL_ALIGNMENT_CENTER:a=(n-r)/2}switch(this.verticalAlignment){case t.VERTICAL_ALIGNMENT_TOP:h=0;break;case t.VERTICAL_ALIGNMENT_BOTTOM:h=s-o;break;case t.VERTICAL_ALIGNMENT_CENTER:h=(s-o)/2}this._paddingLeft.isPixel?(this._currentMeasure.left+=this._paddingLeft.getValue(this._host),this._currentMeasure.width-=this._paddingLeft.getValue(this._host)):(this._currentMeasure.left+=n*this._paddingLeft.getValue(this._host),this._currentMeasure.width-=n*this._paddingLeft.getValue(this._host)),this._paddingRight.isPixel?this._currentMeasure.width-=this._paddingRight.getValue(this._host):this._currentMeasure.width-=n*this._paddingRight.getValue(this._host),this._paddingTop.isPixel?(this._currentMeasure.top+=this._paddingTop.getValue(this._host),this._currentMeasure.height-=this._paddingTop.getValue(this._host)):(this._currentMeasure.top+=s*this._paddingTop.getValue(this._host),this._currentMeasure.height-=s*this._paddingTop.getValue(this._host)),this._paddingBottom.isPixel?this._currentMeasure.height-=this._paddingBottom.getValue(this._host):this._currentMeasure.height-=s*this._paddingBottom.getValue(this._host),this._left.isPixel?this._currentMeasure.left+=this._left.getValue(this._host):this._currentMeasure.left+=n*this._left.getValue(this._host),this._top.isPixel?this._currentMeasure.top+=this._top.getValue(this._host):this._currentMeasure.top+=s*this._top.getValue(this._host),this._currentMeasure.left+=a,this._currentMeasure.top+=h},t.prototype._preMeasure=function(t,e){},t.prototype._additionalProcessing=function(t,e){},t.prototype._draw=function(t,e){},t.prototype.contains=function(t,e){return this._invertTransformMatrix.transformCoordinates(t,e,this._transformedPosition),t=this._transformedPosition.x,e=this._transformedPosition.y,!(t<this._currentMeasure.left)&&(!(t>this._currentMeasure.left+this._currentMeasure.width)&&(!(e<this._currentMeasure.top)&&(!(e>this._currentMeasure.top+this._currentMeasure.height)&&(this.isPointerBlocker&&(this._host._shouldBlockPointer=!0),!0))))},t.prototype._processPicking=function(t,e,i,r,o){return!!this._isEnabled&&(!(!this.isHitTestVisible||!this.isVisible||this._doNotRender)&&(!!this.contains(t,e)&&(this._processObservables(i,t,e,r,o),!0)))},t.prototype._onPointerMove=function(t,e){this.onPointerMoveObservable.notifyObservers(e,-1,t,this)&&null!=this.parent&&this.parent._onPointerMove(t,e)},t.prototype._onPointerEnter=function(t){return!!this._isEnabled&&(!(this._enterCount>0)&&(-1===this._enterCount&&(this._enterCount=0),this._enterCount++,this.onPointerEnterObservable.notifyObservers(this,-1,t,this)&&null!=this.parent&&this.parent._onPointerEnter(t),!0))},t.prototype._onPointerOut=function(t){this._isEnabled&&(this._enterCount=0,this.onPointerOutObservable.notifyObservers(this,-1,t,this)&&null!=this.parent&&this.parent._onPointerOut(t))},t.prototype._onPointerDown=function(t,e,i,r){return this._onPointerEnter(this),0===this._downCount&&(this._downCount++,this._downPointerIds[i]=!0,this.onPointerDownObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)&&null!=this.parent&&this.parent._onPointerDown(t,e,i,r),!0)},t.prototype._onPointerUp=function(t,e,i,r,o){if(this._isEnabled){this._downCount=0,delete this._downPointerIds[i];var n=o;o&&(this._enterCount>0||-1===this._enterCount)&&(n=this.onPointerClickObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)),this.onPointerUpObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)&&null!=this.parent&&this.parent._onPointerUp(t,e,i,r,n)}},t.prototype._forcePointerUp=function(t){if(void 0===t&&(t=null),null!==t)this._onPointerUp(this,o.Vector2.Zero(),t,0,!0);else for(var e in this._downPointerIds)this._onPointerUp(this,o.Vector2.Zero(),+e,0,!0)},t.prototype._processObservables=function(t,e,i,r,n){if(!this._isEnabled)return!1;if(this._dummyVector2.copyFromFloats(e,i),t===o.PointerEventTypes.POINTERMOVE){this._onPointerMove(this,this._dummyVector2);var s=this._host._lastControlOver[r];return s&&s!==this&&s._onPointerOut(this),s!==this&&this._onPointerEnter(this),this._host._lastControlOver[r]=this,!0}return t===o.PointerEventTypes.POINTERDOWN?(this._onPointerDown(this,this._dummyVector2,r,n),this._host._lastControlDown[r]=this,this._host._lastPickedControl=this,!0):t===o.PointerEventTypes.POINTERUP&&(this._host._lastControlDown[r]&&this._host._lastControlDown[r]._onPointerUp(this,this._dummyVector2,r,n,!0),delete this._host._lastControlDown[r],!0)},t.prototype._prepareFont=function(){(this._font||this._fontSet)&&(this._style?this._font=this._style.fontStyle+" "+this._style.fontWeight+" "+this.fontSizeInPixels+"px "+this._style.fontFamily:this._font=this._fontStyle+" "+this._fontWeight+" "+this.fontSizeInPixels+"px "+this._fontFamily,this._fontOffset=t._GetFontOffset(this._font))},t.prototype.dispose=function(){(this.onDirtyObservable.clear(),this.onAfterDrawObservable.clear(),this.onPointerDownObservable.clear(),this.onPointerEnterObservable.clear(),this.onPointerMoveObservable.clear(),this.onPointerOutObservable.clear(),this.onPointerUpObservable.clear(),this.onPointerClickObservable.clear(),this._styleObserver&&this._style&&(this._style.onChangedObservable.remove(this._styleObserver),this._styleObserver=null),this._root&&(this._root.removeControl(this),this._root=null),this._host)&&(this._host._linkedControls.indexOf(this)>-1&&this.linkWithMesh(null))},Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_LEFT",{get:function(){return t._HORIZONTAL_ALIGNMENT_LEFT},enumerable:!0,configurable:!0}),Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_RIGHT",{get:function(){return t._HORIZONTAL_ALIGNMENT_RIGHT},enumerable:!0,configurable:!0}),Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_CENTER",{get:function(){return t._HORIZONTAL_ALIGNMENT_CENTER},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_TOP",{get:function(){return t._VERTICAL_ALIGNMENT_TOP},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_BOTTOM",{get:function(){return t._VERTICAL_ALIGNMENT_BOTTOM},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_CENTER",{get:function(){return t._VERTICAL_ALIGNMENT_CENTER},enumerable:!0,configurable:!0}),t._GetFontOffset=function(e){if(t._FontHeightSizes[e])return t._FontHeightSizes[e];var i=document.createElement("span");i.innerHTML="Hg",i.style.font=e;var r=document.createElement("div");r.style.display="inline-block",r.style.width="1px",r.style.height="0px",r.style.verticalAlign="bottom";var o=document.createElement("div");o.appendChild(i),o.appendChild(r),document.body.appendChild(o);var n=0,s=0;try{s=r.getBoundingClientRect().top-i.getBoundingClientRect().top,r.style.verticalAlign="baseline",n=r.getBoundingClientRect().top-i.getBoundingClientRect().top}finally{document.body.removeChild(o)}var a={ascent:n,height:s,descent:s-n};return t._FontHeightSizes[e]=a,a},t.drawEllipse=function(t,e,i,r,o){o.translate(t,e),o.scale(i,r),o.beginPath(),o.arc(0,0,1,0,2*Math.PI),o.closePath(),o.scale(1/i,1/r),o.translate(-t,-e)},t._HORIZONTAL_ALIGNMENT_LEFT=0,t._HORIZONTAL_ALIGNMENT_RIGHT=1,t._HORIZONTAL_ALIGNMENT_CENTER=2,t._VERTICAL_ALIGNMENT_TOP=0,t._VERTICAL_ALIGNMENT_BOTTOM=1,t._VERTICAL_ALIGNMENT_CENTER=2,t._FontHeightSizes={},t.AddHeader=function(){},t}();e.Control=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=function(){function t(e,i,r){void 0===i&&(i=t.UNITMODE_PIXEL),void 0===r&&(r=!0),this.unit=i,this.negativeValueAllowed=r,this._value=1,this.ignoreAdaptiveScaling=!1,this._value=e}return Object.defineProperty(t.prototype,"isPercentage",{get:function(){return this.unit===t.UNITMODE_PERCENTAGE},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isPixel",{get:function(){return this.unit===t.UNITMODE_PIXEL},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"internalValue",{get:function(){return this._value},enumerable:!0,configurable:!0}),t.prototype.getValueInPixel=function(t,e){return this.isPixel?this.getValue(t):this.getValue(t)*e},t.prototype.getValue=function(e){if(e&&!this.ignoreAdaptiveScaling&&this.unit!==t.UNITMODE_PERCENTAGE){var i=0,r=0;if(e.idealWidth&&(i=this._value*e.getSize().width/e.idealWidth),e.idealHeight&&(r=this._value*e.getSize().height/e.idealHeight),e.useSmallestIdeal&&e.idealWidth&&e.idealHeight)return window.innerWidth<window.innerHeight?i:r;if(e.idealWidth)return i;if(e.idealHeight)return r}return this._value},t.prototype.toString=function(e){switch(this.unit){case t.UNITMODE_PERCENTAGE:return 100*this.getValue(e)+"%";case t.UNITMODE_PIXEL:return this.getValue(e)+"px"}return this.unit.toString()},t.prototype.fromString=function(e){var i=t._Regex.exec(e.toString());if(!i||0===i.length)return!1;var r=parseFloat(i[1]),o=this.unit;if(this.negativeValueAllowed||r<0&&(r=0),4===i.length)switch(i[3]){case"px":o=t.UNITMODE_PIXEL;break;case"%":o=t.UNITMODE_PERCENTAGE,r/=100}return(r!==this._value||o!==this.unit)&&(this._value=r,this.unit=o,!0)},Object.defineProperty(t,"UNITMODE_PERCENTAGE",{get:function(){return t._UNITMODE_PERCENTAGE},enumerable:!0,configurable:!0}),Object.defineProperty(t,"UNITMODE_PIXEL",{get:function(){return t._UNITMODE_PIXEL},enumerable:!0,configurable:!0}),t._Regex=/(^-?\d*(\.\d+)?)(%|px)?/,t._UNITMODE_PERCENTAGE=0,t._UNITMODE_PIXEL=1,t}();e.ValueAndUnit=r},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(13),n=i(0),s=function(t){function e(e){var i=t.call(this,e)||this;return i._blockLayout=!1,i._children=new Array,i}return r(e,t),Object.defineProperty(e.prototype,"children",{get:function(){return this._children},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"blockLayout",{get:function(){return this._blockLayout},set:function(t){this._blockLayout!==t&&(this._blockLayout=t,this._blockLayout||this._arrangeChildren())},enumerable:!0,configurable:!0}),e.prototype.updateLayout=function(){return this._arrangeChildren(),this},e.prototype.containsControl=function(t){return-1!==this._children.indexOf(t)},e.prototype.addControl=function(t){return-1!==this._children.indexOf(t)?this:(t.parent=this,t._host=this._host,this._children.push(t),this._host.utilityLayer&&(t._prepareNode(this._host.utilityLayer.utilityLayerScene),t.node&&(t.node.parent=this.node),this.blockLayout||this._arrangeChildren()),this)},e.prototype._arrangeChildren=function(){},e.prototype._createNode=function(t){return new n.TransformNode("ContainerNode",t)},e.prototype.removeControl=function(t){var e=this._children.indexOf(t);return-1!==e&&(this._children.splice(e,1),t.parent=null,t._disposeNode()),this},e.prototype._getTypeName=function(){return"Container3D"},e.prototype.dispose=function(){for(var e=0,i=this._children;e<i.length;e++){i[e].dispose()}this._children=[],t.prototype.dispose.call(this)},e.UNSET_ORIENTATION=0,e.FACEORIGIN_ORIENTATION=1,e.FACEORIGINREVERSED_ORIENTATION=2,e.FACEFORWARD_ORIENTATION=3,e.FACEFORWARDREVERSED_ORIENTATION=4,e}(o.Control3D);e.Container3D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(7),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._children=new Array,i._measureForChildren=n.Measure.Empty(),i._adaptWidthToChildren=!1,i._adaptHeightToChildren=!1,i}return r(e,t),Object.defineProperty(e.prototype,"adaptHeightToChildren",{get:function(){return this._adaptHeightToChildren},set:function(t){this._adaptHeightToChildren!==t&&(this._adaptHeightToChildren=t,t&&(this.height="100%"),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"adaptWidthToChildren",{get:function(){return this._adaptWidthToChildren},set:function(t){this._adaptWidthToChildren!==t&&(this._adaptWidthToChildren=t,t&&(this.width="100%"),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"children",{get:function(){return this._children},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Container"},e.prototype._flagDescendantsAsMatrixDirty=function(){for(var t=0,e=this.children;t<e.length;t++){e[t]._markMatrixAsDirty()}},e.prototype.getChildByName=function(t){for(var e=0,i=this.children;e<i.length;e++){var r=i[e];if(r.name===t)return r}return null},e.prototype.getChildByType=function(t,e){for(var i=0,r=this.children;i<r.length;i++){var o=r[i];if(o.typeName===e)return o}return null},e.prototype.containsControl=function(t){return-1!==this.children.indexOf(t)},e.prototype.addControl=function(t){return t?-1!==this._children.indexOf(t)?this:(t._link(this,this._host),t._markAllAsDirty(),this._reOrderControl(t),this._markAsDirty(),this):this},e.prototype.clearControls=function(){for(var t=0,e=this._children.slice();t<e.length;t++){var i=e[t];this.removeControl(i)}return this},e.prototype.removeControl=function(t){var e=this._children.indexOf(t);return-1!==e&&(this._children.splice(e,1),t.parent=null),t.linkWithMesh(null),this._host&&this._host._cleanControlAfterRemoval(t),this._markAsDirty(),this},e.prototype._reOrderControl=function(t){this.removeControl(t);for(var e=0;e<this._children.length;e++)if(this._children[e].zIndex>t.zIndex)return void this._children.splice(e,0,t);this._children.push(t),t.parent=this,this._markAsDirty()},e.prototype._markAllAsDirty=function(){t.prototype._markAllAsDirty.call(this);for(var e=0;e<this._children.length;e++)this._children[e]._markAllAsDirty()},e.prototype._localDraw=function(t){this._background&&((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),t.fillStyle=this._background,t.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0))},e.prototype._link=function(e,i){t.prototype._link.call(this,e,i);for(var r=0,o=this._children;r<o.length;r++){o[r]._link(this,i)}},e.prototype._draw=function(t,e){if(this.isVisible&&!this.notRenderable){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){this._localDraw(e),this._clipForChildren(e);for(var i=-1,r=-1,o=0,n=this._children;o<n.length;o++){var s=n[o];s.isVisible&&!s.notRenderable&&(s._tempParentMeasure.copyFrom(this._measureForChildren),s._draw(this._measureForChildren,e),s.onAfterDrawObservable.hasObservers()&&s.onAfterDrawObservable.notifyObservers(s),this.adaptWidthToChildren&&s._width.isPixel&&(i=Math.max(i,s._currentMeasure.width)),this.adaptHeightToChildren&&s._height.isPixel&&(r=Math.max(r,s._currentMeasure.height)))}this.adaptWidthToChildren&&i>=0&&(this.width=i+"px"),this.adaptHeightToChildren&&r>=0&&(this.height=r+"px")}e.restore(),this.onAfterDrawObservable.hasObservers()&&this.onAfterDrawObservable.notifyObservers(this)}},e.prototype._processPicking=function(e,i,r,o,n){if(!this.isVisible||this.notRenderable)return!1;if(!t.prototype.contains.call(this,e,i))return!1;for(var s=this._children.length-1;s>=0;s--){var a=this._children[s];if(a._processPicking(e,i,r,o,n))return a.hoverCursor&&this._host._changeCursor(a.hoverCursor),!0}return!!this.isHitTestVisible&&this._processObservables(r,e,i,o,n)},e.prototype._clipForChildren=function(t){},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.copyFrom(this._currentMeasure)},e.prototype.dispose=function(){t.prototype.dispose.call(this);for(var e=0,i=this._children;e<i.length;e++){i[e].dispose()}},e}(o.Control);e.Container=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o,n=i(0),s=i(2),a=i(1);!function(t){t[t.Clip=0]="Clip",t[t.WordWrap=1]="WordWrap",t[t.Ellipsis=2]="Ellipsis"}(o=e.TextWrapping||(e.TextWrapping={}));var h=function(t){function e(e,i){void 0===i&&(i="");var r=t.call(this,e)||this;return r.name=e,r._text="",r._textWrapping=o.Clip,r._textHorizontalAlignment=a.Control.HORIZONTAL_ALIGNMENT_CENTER,r._textVerticalAlignment=a.Control.VERTICAL_ALIGNMENT_CENTER,r._resizeToFit=!1,r._lineSpacing=new s.ValueAndUnit(0),r._outlineWidth=0,r._outlineColor="white",r.onTextChangedObservable=new n.Observable,r.onLinesReadyObservable=new n.Observable,r.text=i,r}return r(e,t),Object.defineProperty(e.prototype,"lines",{get:function(){return this._lines},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"resizeToFit",{get:function(){return this._resizeToFit},set:function(t){this._resizeToFit=t,this._resizeToFit&&(this._width.ignoreAdaptiveScaling=!0,this._height.ignoreAdaptiveScaling=!0)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textWrapping",{get:function(){return this._textWrapping},set:function(t){this._textWrapping!==t&&(this._textWrapping=+t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._markAsDirty(),this.onTextChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textHorizontalAlignment",{get:function(){return this._textHorizontalAlignment},set:function(t){this._textHorizontalAlignment!==t&&(this._textHorizontalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textVerticalAlignment",{get:function(){return this._textVerticalAlignment},set:function(t){this._textVerticalAlignment!==t&&(this._textVerticalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"lineSpacing",{get:function(){return this._lineSpacing.toString(this._host)},set:function(t){this._lineSpacing.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"outlineWidth",{get:function(){return this._outlineWidth},set:function(t){this._outlineWidth!==t&&(this._outlineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"outlineColor",{get:function(){return this._outlineColor},set:function(t){this._outlineColor!==t&&(this._outlineColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"TextBlock"},e.prototype._drawText=function(t,e,i,r){var o=this._currentMeasure.width,n=0;switch(this._textHorizontalAlignment){case a.Control.HORIZONTAL_ALIGNMENT_LEFT:n=0;break;case a.Control.HORIZONTAL_ALIGNMENT_RIGHT:n=o-e;break;case a.Control.HORIZONTAL_ALIGNMENT_CENTER:n=(o-e)/2}(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(r.shadowColor=this.shadowColor,r.shadowBlur=this.shadowBlur,r.shadowOffsetX=this.shadowOffsetX,r.shadowOffsetY=this.shadowOffsetY),this.outlineWidth&&r.strokeText(t,this._currentMeasure.left+n,i),r.fillText(t,this._currentMeasure.left+n,i)},e.prototype._draw=function(t,e){e.save(),this._applyStates(e),this._processMeasures(t,e)&&this._renderLines(e),e.restore()},e.prototype._applyStates=function(e){t.prototype._applyStates.call(this,e),this.outlineWidth&&(e.lineWidth=this.outlineWidth,e.strokeStyle=this.outlineColor)},e.prototype._additionalProcessing=function(t,e){this._lines=this._breakLines(this._currentMeasure.width,e),this.onLinesReadyObservable.notifyObservers(this)},e.prototype._breakLines=function(t,e){var i=[],r=this.text.split("\n");if(this._textWrapping!==o.Ellipsis||this._resizeToFit)if(this._textWrapping!==o.WordWrap||this._resizeToFit)for(var n=0,s=r;n<s.length;n++){l=s[n];i.push(this._parseLine(l,e))}else for(var a=0,h=r;a<h.length;a++){var l=h[a];i.push.apply(i,this._parseLineWordWrap(l,t,e))}else for(var u=0,c=r;u<c.length;u++){var l=c[u];i.push(this._parseLineEllipsis(l,t,e))}return i},e.prototype._parseLine=function(t,e){return void 0===t&&(t=""),{text:t,width:e.measureText(t).width}},e.prototype._parseLineEllipsis=function(t,e,i){void 0===t&&(t="");var r=i.measureText(t).width;for(r>e&&(t+="…");t.length>2&&r>e;)t=t.slice(0,-2)+"…",r=i.measureText(t).width;return{text:t,width:r}},e.prototype._parseLineWordWrap=function(t,e,i){void 0===t&&(t="");for(var r=[],o=t.split(" "),n=0,s=0;s<o.length;s++){var a=s>0?t+" "+o[s]:o[0],h=i.measureText(a).width;h>e&&s>0?(r.push({text:t,width:n}),t=o[s],n=i.measureText(t).width):(n=h,t=a)}return r.push({text:t,width:n}),r},e.prototype._renderLines=function(t){var e=this._currentMeasure.height;this._fontOffset||(this._fontOffset=a.Control._GetFontOffset(t.font));var i=0;switch(this._textVerticalAlignment){case a.Control.VERTICAL_ALIGNMENT_TOP:i=this._fontOffset.ascent;break;case a.Control.VERTICAL_ALIGNMENT_BOTTOM:i=e-this._fontOffset.height*(this._lines.length-1)-this._fontOffset.descent;break;case a.Control.VERTICAL_ALIGNMENT_CENTER:i=this._fontOffset.ascent+(e-this._fontOffset.height*this._lines.length)/2}i+=this._currentMeasure.top;for(var r=0,o=0;o<this._lines.length;o++){var n=this._lines[o];0!==o&&0!==this._lineSpacing.internalValue&&(this._lineSpacing.isPixel?i+=this._lineSpacing.getValue(this._host):i+=this._lineSpacing.getValue(this._host)*this._height.getValueInPixel(this._host,this._cachedParentMeasure.height)),this._drawText(n.text,n.width,i,t),i+=this._fontOffset.height,n.width>r&&(r=n.width)}this._resizeToFit&&(this.width=this.paddingLeftInPixels+this.paddingRightInPixels+r+"px",this.height=this.paddingTopInPixels+this.paddingBottomInPixels+this._fontOffset.height*this._lines.length+"px")},e.prototype.computeExpectedHeight=function(){if(this.text&&this.widthInPixels){var t=document.createElement("canvas").getContext("2d");if(t){this._applyStates(t),this._fontOffset||(this._fontOffset=a.Control._GetFontOffset(t.font));var e=this._lines?this._lines:this._breakLines(this.widthInPixels-this.paddingLeftInPixels-this.paddingRightInPixels,t);return this.paddingTopInPixels+this.paddingBottomInPixels+this._fontOffset.height*e.length}}return 0},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.onTextChangedObservable.clear()},e}(a.Control);e.TextBlock=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(7),s=i(1),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isVertical=!0,i._manualWidth=!1,i._manualHeight=!1,i._doNotTrackManualChanges=!1,i._tempMeasureStore=n.Measure.Empty(),i}return r(e,t),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){this._isVertical!==t&&(this._isVertical=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._doNotTrackManualChanges||(this._manualWidth=!0),this._width.toString(this._host)!==t&&this._width.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"height",{get:function(){return this._height.toString(this._host)},set:function(t){this._doNotTrackManualChanges||(this._manualHeight=!0),this._height.toString(this._host)!==t&&this._height.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"StackPanel"},e.prototype._preMeasure=function(e,i){for(var r=0,o=0,n=0,a=this._children;n<a.length;n++){var h=a[n];this._tempMeasureStore.copyFrom(h._currentMeasure),h._currentMeasure.copyFrom(e),h._measure(),this._isVertical?(h.top=o+"px",h._top.ignoreAdaptiveScaling||h._markAsDirty(),h._top.ignoreAdaptiveScaling=!0,o+=h._currentMeasure.height,h._currentMeasure.width>r&&(r=h._currentMeasure.width),h.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP):(h.left=r+"px",h._left.ignoreAdaptiveScaling||h._markAsDirty(),h._left.ignoreAdaptiveScaling=!0,r+=h._currentMeasure.width,h._currentMeasure.height>o&&(o=h._currentMeasure.height),h.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT),h._currentMeasure.copyFrom(this._tempMeasureStore)}this._doNotTrackManualChanges=!0;var l,u,c=this.height,_=this.width;this._manualHeight||(this.height=o+"px"),this._manualWidth||(this.width=r+"px"),l=_!==this.width||!this._width.ignoreAdaptiveScaling,(u=c!==this.height||!this._height.ignoreAdaptiveScaling)&&(this._height.ignoreAdaptiveScaling=!0),l&&(this._width.ignoreAdaptiveScaling=!0),this._doNotTrackManualChanges=!1,(l||u)&&this._markAllAsDirty(),t.prototype._preMeasure.call(this,e,i)},e}(o.Container);e.StackPanel=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=function(){function t(t,e,i,r){this.left=t,this.top=e,this.width=i,this.height=r}return t.prototype.copyFrom=function(t){this.left=t.left,this.top=t.top,this.width=t.width,this.height=t.height},t.prototype.isEqualsTo=function(t){return this.left===t.left&&(this.top===t.top&&(this.width===t.width&&this.height===t.height))},t.Empty=function(){return new t(0,0,0,0)},t}();e.Measure=r},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(3),n=i(0),s=function(t){function e(){var e=t.call(this)||this;return e._columns=10,e._rows=0,e._rowThenColum=!0,e._orientation=o.Container3D.FACEORIGIN_ORIENTATION,e.margin=0,e}return r(e,t),Object.defineProperty(e.prototype,"orientation",{get:function(){return this._orientation},set:function(t){var e=this;this._orientation!==t&&(this._orientation=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"columns",{get:function(){return this._columns},set:function(t){var e=this;this._columns!==t&&(this._columns=t,this._rowThenColum=!0,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"rows",{get:function(){return this._rows},set:function(t){var e=this;this._rows!==t&&(this._rows=t,this._rowThenColum=!1,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._arrangeChildren=function(){this._cellWidth=0,this._cellHeight=0;for(var t=0,e=0,i=0,r=n.Matrix.Invert(this.node.computeWorldMatrix(!0)),o=0,s=this._children;o<s.length;o++){if((b=s[o]).mesh){i++,b.mesh.computeWorldMatrix(!0);var a=b.mesh.getHierarchyBoundingVectors(),h=n.Tmp.Vector3[0],l=n.Tmp.Vector3[1];a.max.subtractToRef(a.min,l),l.scaleInPlace(.5),n.Vector3.TransformNormalToRef(l,r,h),this._cellWidth=Math.max(this._cellWidth,2*h.x),this._cellHeight=Math.max(this._cellHeight,2*h.y)}}this._cellWidth+=2*this.margin,this._cellHeight+=2*this.margin,this._rowThenColum?(e=this._columns,t=Math.ceil(i/this._columns)):(t=this._rows,e=Math.ceil(i/this._rows));var u=.5*e*this._cellWidth,c=.5*t*this._cellHeight,_=[],f=0;if(this._rowThenColum)for(var p=0;p<t;p++)for(var d=0;d<e&&(_.push(new n.Vector3(d*this._cellWidth-u+this._cellWidth/2,p*this._cellHeight-c+this._cellHeight/2,0)),!(++f>i));d++);else for(d=0;d<e;d++)for(p=0;p<t&&(_.push(new n.Vector3(d*this._cellWidth-u+this._cellWidth/2,p*this._cellHeight-c+this._cellHeight/2,0)),!(++f>i));p++);f=0;for(var y=0,g=this._children;y<g.length;y++){var b;(b=g[y]).mesh&&(this._mapGridNode(b,_[f]),f++)}this._finalProcessing()},e.prototype._finalProcessing=function(){},e}(o.Container3D);e.VolumeBasedPanel=s},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(16)),r(i(18)),r(i(30)),r(i(4)),r(i(1)),r(i(31)),r(i(32)),r(i(11)),r(i(19)),r(i(33)),r(i(34)),r(i(35)),r(i(21)),r(i(6)),r(i(36)),r(i(5)),r(i(37)),r(i(22)),r(i(10)),r(i(38)),r(i(39))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thickness=1,i._cornerRadius=0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cornerRadius",{get:function(){return this._cornerRadius},set:function(t){t<0&&(t=0),this._cornerRadius!==t&&(this._cornerRadius=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Rectangle"},e.prototype._localDraw=function(t){t.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),this._background&&(t.fillStyle=this._background,this._cornerRadius?(this._drawRoundedRect(t,this._thickness/2),t.fill()):t.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)),this._thickness&&((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0),this.color&&(t.strokeStyle=this.color),t.lineWidth=this._thickness,this._cornerRadius?(this._drawRoundedRect(t,this._thickness/2),t.stroke()):t.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,this._currentMeasure.width-this._thickness,this._currentMeasure.height-this._thickness)),t.restore()},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.width-=2*this._thickness,this._measureForChildren.height-=2*this._thickness,this._measureForChildren.left+=this._thickness,this._measureForChildren.top+=this._thickness},e.prototype._drawRoundedRect=function(t,e){void 0===e&&(e=0);var i=this._currentMeasure.left+e,r=this._currentMeasure.top+e,o=this._currentMeasure.width-2*e,n=this._currentMeasure.height-2*e,s=Math.min(n/2-2,Math.min(o/2-2,this._cornerRadius));t.beginPath(),t.moveTo(i+s,r),t.lineTo(i+o-s,r),t.quadraticCurveTo(i+o,r,i+o,r+s),t.lineTo(i+o,r+n-s),t.quadraticCurveTo(i+o,r+n,i+o-s,r+n),t.lineTo(i+s,r+n),t.quadraticCurveTo(i,r+n,i,r+n-s),t.lineTo(i,r+s),t.quadraticCurveTo(i,r,i+s,r),t.closePath()},e.prototype._clipForChildren=function(t){this._cornerRadius&&(this._drawRoundedRect(t,this._thickness),t.clip())},e}(i(4).Container);e.Rectangle=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=function(t){function e(i,r){void 0===r&&(r=null);var o=t.call(this,i)||this;return o.name=i,o._loaded=!1,o._stretch=e.STRETCH_FILL,o._autoScale=!1,o._sourceLeft=0,o._sourceTop=0,o._sourceWidth=0,o._sourceHeight=0,o._cellWidth=0,o._cellHeight=0,o._cellId=-1,o.source=r,o}return r(e,t),Object.defineProperty(e.prototype,"sourceLeft",{get:function(){return this._sourceLeft},set:function(t){this._sourceLeft!==t&&(this._sourceLeft=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceTop",{get:function(){return this._sourceTop},set:function(t){this._sourceTop!==t&&(this._sourceTop=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceWidth",{get:function(){return this._sourceWidth},set:function(t){this._sourceWidth!==t&&(this._sourceWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceHeight",{get:function(){return this._sourceHeight},set:function(t){this._sourceHeight!==t&&(this._sourceHeight=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"autoScale",{get:function(){return this._autoScale},set:function(t){this._autoScale!==t&&(this._autoScale=t,t&&this._loaded&&this.synchronizeSizeWithContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"stretch",{get:function(){return this._stretch},set:function(t){this._stretch!==t&&(this._stretch=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"domImage",{get:function(){return this._domImage},set:function(t){var e=this;this._domImage=t,this._loaded=!1,this._domImage.width?this._onImageLoaded():this._domImage.onload=function(){e._onImageLoaded()}},enumerable:!0,configurable:!0}),e.prototype._onImageLoaded=function(){this._imageWidth=this._domImage.width,this._imageHeight=this._domImage.height,this._loaded=!0,this._autoScale&&this.synchronizeSizeWithContent(),this._markAsDirty()},Object.defineProperty(e.prototype,"source",{set:function(t){var e=this;this._source!==t&&(this._loaded=!1,this._source=t,this._domImage=document.createElement("img"),this._domImage.onload=function(){e._onImageLoaded()},t&&(n.Tools.SetCorsBehavior(t,this._domImage),this._domImage.src=t))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellWidth",{get:function(){return this._cellWidth},set:function(t){this._cellWidth!==t&&(this._cellWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellHeight",{get:function(){return this._cellHeight},set:function(t){this._cellHeight!==t&&(this._cellHeight=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellId",{get:function(){return this._cellId},set:function(t){this._cellId!==t&&(this._cellId=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Image"},e.prototype.synchronizeSizeWithContent=function(){this._loaded&&(this.width=this._domImage.width+"px",this.height=this._domImage.height+"px")},e.prototype._draw=function(t,i){var r,o,n,s;if(i.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(i.shadowColor=this.shadowColor,i.shadowBlur=this.shadowBlur,i.shadowOffsetX=this.shadowOffsetX,i.shadowOffsetY=this.shadowOffsetY),-1==this.cellId)r=this._sourceLeft,o=this._sourceTop,n=this._sourceWidth?this._sourceWidth:this._imageWidth,s=this._sourceHeight?this._sourceHeight:this._imageHeight;else{var a=this._domImage.naturalWidth/this.cellWidth,h=this.cellId/a>>0,l=this.cellId%a;r=this.cellWidth*l,o=this.cellHeight*h,n=this.cellWidth,s=this.cellHeight}if(this._applyStates(i),this._processMeasures(t,i)&&this._loaded)switch(this._stretch){case e.STRETCH_NONE:case e.STRETCH_FILL:i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height);break;case e.STRETCH_UNIFORM:var u=this._currentMeasure.width/n,c=this._currentMeasure.height/s,_=Math.min(u,c),f=(this._currentMeasure.width-n*_)/2,p=(this._currentMeasure.height-s*_)/2;i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left+f,this._currentMeasure.top+p,n*_,s*_);break;case e.STRETCH_EXTEND:i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height),this._autoScale&&this.synchronizeSizeWithContent(),this._root&&this._root.parent&&(this._root.width=this.width,this._root.height=this.height)}i.restore()},e.STRETCH_NONE=0,e.STRETCH_FILL=1,e.STRETCH_UNIFORM=2,e.STRETCH_EXTEND=3,e}(o.Control);e.Image=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=i(4),s=i(23),a=i(7),h=function(t){function e(e,i,r,s,a,h){void 0===i&&(i=0),void 0===r&&(r=0),void 0===a&&(a=!1),void 0===h&&(h=o.Texture.NEAREST_SAMPLINGMODE);var l=t.call(this,e,{width:i,height:r},s,a,h,o.Engine.TEXTUREFORMAT_RGBA)||this;return l._isDirty=!1,l._rootContainer=new n.Container("root"),l._lastControlOver={},l._lastControlDown={},l._capturingControl={},l._linkedControls=new Array,l._isFullscreen=!1,l._fullscreenViewport=new o.Viewport(0,0,1,1),l._idealWidth=0,l._idealHeight=0,l._useSmallestIdeal=!1,l._renderAtIdealSize=!1,l._blockNextFocusCheck=!1,l._renderScale=1,l.premulAlpha=!1,(s=l.getScene())&&l._texture?(l._rootCanvas=s.getEngine().getRenderingCanvas(),l._renderObserver=s.onBeforeCameraRenderObservable.add(function(t){return l._checkUpdate(t)}),l._preKeyboardObserver=s.onPreKeyboardObservable.add(function(t){l._focusedControl&&(t.type===o.KeyboardEventTypes.KEYDOWN&&l._focusedControl.processKeyboard(t.event),t.skipOnPointerObservable=!0)}),l._rootContainer._link(null,l),l.hasAlpha=!0,i&&r||(l._resizeObserver=s.getEngine().onResizeObservable.add(function(){return l._onResize()}),l._onResize()),l._texture.isReady=!0,l):l}return r(e,t),Object.defineProperty(e.prototype,"renderScale",{get:function(){return this._renderScale},set:function(t){t!==this._renderScale&&(this._renderScale=t,this._onResize())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this.markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"idealWidth",{get:function(){return this._idealWidth},set:function(t){this._idealWidth!==t&&(this._idealWidth=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"idealHeight",{get:function(){return this._idealHeight},set:function(t){this._idealHeight!==t&&(this._idealHeight=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"useSmallestIdeal",{get:function(){return this._useSmallestIdeal},set:function(t){this._useSmallestIdeal!==t&&(this._useSmallestIdeal=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"renderAtIdealSize",{get:function(){return this._renderAtIdealSize},set:function(t){this._renderAtIdealSize!==t&&(this._renderAtIdealSize=t,this._onResize())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"layer",{get:function(){return this._layerToDispose},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"rootContainer",{get:function(){return this._rootContainer},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"focusedControl",{get:function(){return this._focusedControl},set:function(t){this._focusedControl!=t&&(this._focusedControl&&this._focusedControl.onBlur(),t&&t.onFocus(),this._focusedControl=t)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isForeground",{get:function(){return!this.layer||!this.layer.isBackground},set:function(t){this.layer&&this.layer.isBackground!==!t&&(this.layer.isBackground=!t)},enumerable:!0,configurable:!0}),e.prototype.executeOnAllControls=function(t,e){e||(e=this._rootContainer),t(e);for(var i=0,r=e.children;i<r.length;i++){var o=r[i];o.children?this.executeOnAllControls(t,o):t(o)}},e.prototype.markAsDirty=function(){this._isDirty=!0},e.prototype.createStyle=function(){return new s.Style(this)},e.prototype.addControl=function(t){return this._rootContainer.addControl(t),this},e.prototype.removeControl=function(t){return this._rootContainer.removeControl(t),this},e.prototype.dispose=function(){var e=this.getScene();e&&(this._rootCanvas=null,e.onBeforeCameraRenderObservable.remove(this._renderObserver),this._resizeObserver&&e.getEngine().onResizeObservable.remove(this._resizeObserver),this._pointerMoveObserver&&e.onPrePointerObservable.remove(this._pointerMoveObserver),this._pointerObserver&&e.onPointerObservable.remove(this._pointerObserver),this._preKeyboardObserver&&e.onPreKeyboardObservable.remove(this._preKeyboardObserver),this._canvasPointerOutObserver&&e.getEngine().onCanvasPointerOutObservable.remove(this._canvasPointerOutObserver),this._layerToDispose&&(this._layerToDispose.texture=null,this._layerToDispose.dispose(),this._layerToDispose=null),this._rootContainer.dispose(),t.prototype.dispose.call(this))},e.prototype._onResize=function(){var t=this.getScene();if(t){var e=t.getEngine(),i=this.getSize(),r=e.getRenderWidth()*this._renderScale,o=e.getRenderHeight()*this._renderScale;this._renderAtIdealSize&&(this._idealWidth?(o=o*this._idealWidth/r,r=this._idealWidth):this._idealHeight&&(r=r*this._idealHeight/o,o=this._idealHeight)),i.width===r&&i.height===o||(this.scaleTo(r,o),this.markAsDirty(),(this._idealWidth||this._idealHeight)&&this._rootContainer._markAllAsDirty())}},e.prototype._getGlobalViewport=function(t){var e=t.getEngine();return this._fullscreenViewport.toGlobal(e.getRenderWidth(),e.getRenderHeight())},e.prototype.getProjectedPosition=function(t,e){var i=this.getScene();if(!i)return o.Vector2.Zero();var r=this._getGlobalViewport(i),n=o.Vector3.Project(t,e,i.getTransformMatrix(),r);return n.scaleInPlace(this.renderScale),new o.Vector2(n.x,n.y)},e.prototype._checkUpdate=function(t){if(!this._layerToDispose||0!=(t.layerMask&this._layerToDispose.layerMask)){if(this._isFullscreen&&this._linkedControls.length){var e=this.getScene();if(!e)return;for(var i=this._getGlobalViewport(e),r=0,n=this._linkedControls;r<n.length;r++){var s=n[r];if(s.isVisible){var a=s._linkedMesh;if(a&&!a.isDisposed()){var h=a.getBoundingInfo().boundingSphere.center,l=o.Vector3.Project(h,a.getWorldMatrix(),e.getTransformMatrix(),i);l.z<0||l.z>1?s.notRenderable=!0:(s.notRenderable=!1,l.scaleInPlace(this.renderScale),s._moveToProjectedPosition(l))}else o.Tools.SetImmediate(function(){s.linkWithMesh(null)})}}}(this._isDirty||this._rootContainer.isDirty)&&(this._isDirty=!1,this._render(),this.update(!0,this.premulAlpha))}},e.prototype._render=function(){var t=this.getSize(),e=t.width,i=t.height,r=this.getContext();r.clearRect(0,0,e,i),this._background&&(r.save(),r.fillStyle=this._background,r.fillRect(0,0,e,i),r.restore()),r.font="18px Arial",r.strokeStyle="white";var o=new a.Measure(0,0,e,i);this._rootContainer._draw(o,r)},e.prototype._changeCursor=function(t){this._rootCanvas&&(this._rootCanvas.style.cursor=t)},e.prototype._doPicking=function(t,e,i,r,n){var s=this.getScene();if(s){var a=s.getEngine(),h=this.getSize();this._isFullscreen&&(t*=h.width/a.getRenderWidth(),e*=h.height/a.getRenderHeight()),this._capturingControl[r]?this._capturingControl[r]._processObservables(i,t,e,r,n):(this._rootContainer._processPicking(t,e,i,r,n)||(this._changeCursor(""),i===o.PointerEventTypes.POINTERMOVE&&(this._lastControlOver[r]&&this._lastControlOver[r]._onPointerOut(this._lastControlOver[r]),delete this._lastControlOver[r])),this._manageFocus())}},e.prototype._cleanControlAfterRemovalFromList=function(t,e){for(var i in t){if(t.hasOwnProperty(i))t[i]===e&&delete t[i]}},e.prototype._cleanControlAfterRemoval=function(t){this._cleanControlAfterRemovalFromList(this._lastControlDown,t),this._cleanControlAfterRemovalFromList(this._lastControlOver,t)},e.prototype.attach=function(){var t=this,e=this.getScene();e&&(this._pointerMoveObserver=e.onPrePointerObservable.add(function(i,r){if(!e.isPointerCaptured(i.event.pointerId)&&(i.type===o.PointerEventTypes.POINTERMOVE||i.type===o.PointerEventTypes.POINTERUP||i.type===o.PointerEventTypes.POINTERDOWN)&&e){var n=e.cameraToUseForPointers||e.activeCamera;if(n){var s=e.getEngine(),a=n.viewport,h=(e.pointerX/s.getHardwareScalingLevel()-a.x*s.getRenderWidth())/a.width,l=(e.pointerY/s.getHardwareScalingLevel()-a.y*s.getRenderHeight())/a.height;t._shouldBlockPointer=!1,t._doPicking(h,l,i.type,i.event.pointerId||0,i.event.button),t._shouldBlockPointer&&(i.skipOnPointerObservable=t._shouldBlockPointer)}}}),this._attachToOnPointerOut(e))},e.prototype.attachToMesh=function(t,e){var i=this;void 0===e&&(e=!0);var r=this.getScene();r&&(this._pointerObserver=r.onPointerObservable.add(function(e,r){if(e.type===o.PointerEventTypes.POINTERMOVE||e.type===o.PointerEventTypes.POINTERUP||e.type===o.PointerEventTypes.POINTERDOWN){var n=e.event.pointerId||0;if(e.pickInfo&&e.pickInfo.hit&&e.pickInfo.pickedMesh===t){var s=e.pickInfo.getTextureCoordinates();if(s){var a=i.getSize();i._doPicking(s.x*a.width,(1-s.y)*a.height,e.type,n,e.event.button)}}else if(e.type===o.PointerEventTypes.POINTERUP){if(i._lastControlDown[n]&&i._lastControlDown[n]._forcePointerUp(n),delete i._lastControlDown[n],i.focusedControl){var h=i.focusedControl.keepsFocusWith(),l=!0;if(h)for(var u=0,c=h;u<c.length;u++){var _=c[u];if(i!==_._host){var f=_._host;if(f._lastControlOver[n]&&f._lastControlOver[n].isAscendant(_)){l=!1;break}}}l&&(i.focusedControl=null)}}else e.type===o.PointerEventTypes.POINTERMOVE&&(i._lastControlOver[n]&&i._lastControlOver[n]._onPointerOut(i._lastControlOver[n]),delete i._lastControlOver[n])}}),t.enablePointerMoveEvents=e,this._attachToOnPointerOut(r))},e.prototype.moveFocusToControl=function(t){this.focusedControl=t,this._lastPickedControl=t,this._blockNextFocusCheck=!0},e.prototype._manageFocus=function(){if(this._blockNextFocusCheck)return this._blockNextFocusCheck=!1,void(this._lastPickedControl=this._focusedControl);if(this._focusedControl&&this._focusedControl!==this._lastPickedControl){if(this._lastPickedControl.isFocusInvisible)return;this.focusedControl=null}},e.prototype._attachToOnPointerOut=function(t){var e=this;this._canvasPointerOutObserver=t.getEngine().onCanvasPointerOutObservable.add(function(t){e._lastControlOver[t.pointerId]&&e._lastControlOver[t.pointerId]._onPointerOut(e._lastControlOver[t.pointerId]),delete e._lastControlOver[t.pointerId],e._lastControlDown[t.pointerId]&&e._lastControlDown[t.pointerId]._forcePointerUp(),delete e._lastControlDown[t.pointerId]})},e.CreateForMesh=function(t,i,r,n,s){void 0===i&&(i=1024),void 0===r&&(r=1024),void 0===n&&(n=!0),void 0===s&&(s=!1);var a=new e(t.name+" AdvancedDynamicTexture",i,r,t.getScene(),!0,o.Texture.TRILINEAR_SAMPLINGMODE),h=new o.StandardMaterial("AdvancedDynamicTextureMaterial",t.getScene());return h.backFaceCulling=!1,h.diffuseColor=o.Color3.Black(),h.specularColor=o.Color3.Black(),s?(h.diffuseTexture=a,h.emissiveTexture=a,a.hasAlpha=!0):(h.emissiveTexture=a,h.opacityTexture=a),t.material=h,a.attachToMesh(t,n),a},e.CreateFullscreenUI=function(t,i,r,n){void 0===i&&(i=!0),void 0===r&&(r=null),void 0===n&&(n=o.Texture.BILINEAR_SAMPLINGMODE);var s=new e(t,0,0,r,!1,n),a=new o.Layer(t+"_layer",null,r,!i);return a.texture=s,s._layerToDispose=a,s._isFullscreen=!0,s.attach(),s},e}(o.DynamicTexture);e.AdvancedDynamicTexture=h},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(25),n=function(){function t(t){this.name=t,this._downCount=0,this._enterCount=-1,this._downPointerIds={},this._isVisible=!0,this.onPointerMoveObservable=new r.Observable,this.onPointerOutObservable=new r.Observable,this.onPointerDownObservable=new r.Observable,this.onPointerUpObservable=new r.Observable,this.onPointerClickObservable=new r.Observable,this.onPointerEnterObservable=new r.Observable,this._behaviors=new Array}return Object.defineProperty(t.prototype,"position",{get:function(){return this._node?this._node.position:r.Vector3.Zero()},set:function(t){this._node&&(this._node.position=t)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaling",{get:function(){return this._node?this._node.scaling:new r.Vector3(1,1,1)},set:function(t){this._node&&(this._node.scaling=t)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"behaviors",{get:function(){return this._behaviors},enumerable:!0,configurable:!0}),t.prototype.addBehavior=function(t){var e=this;if(-1!==this._behaviors.indexOf(t))return this;t.init();var i=this._host.scene;return i.isLoading?i.onDataLoadedObservable.addOnce(function(){t.attach(e)}):t.attach(this),this._behaviors.push(t),this},t.prototype.removeBehavior=function(t){var e=this._behaviors.indexOf(t);return-1===e?this:(this._behaviors[e].detach(),this._behaviors.splice(e,1),this)},t.prototype.getBehaviorByName=function(t){for(var e=0,i=this._behaviors;e<i.length;e++){var r=i[e];if(r.name===t)return r}return null},Object.defineProperty(t.prototype,"isVisible",{get:function(){return this._isVisible},set:function(t){if(this._isVisible!==t){this._isVisible=t;var e=this.mesh;e&&e.setEnabled(t)}},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"typeName",{get:function(){return this._getTypeName()},enumerable:!0,configurable:!0}),t.prototype._getTypeName=function(){return"Control3D"},Object.defineProperty(t.prototype,"node",{get:function(){return this._node},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"mesh",{get:function(){return this._node instanceof r.AbstractMesh?this._node:null},enumerable:!0,configurable:!0}),t.prototype.linkToTransformNode=function(t){return this._node&&(this._node.parent=t),this},t.prototype._prepareNode=function(t){if(!this._node){if(this._node=this._createNode(t),!this.node)return;this._node.metadata=this,this._node.position=this.position,this._node.scaling=this.scaling;var e=this.mesh;e&&(e.isPickable=!0,this._affectMaterial(e))}},t.prototype._createNode=function(t){return null},t.prototype._affectMaterial=function(t){t.material=null},t.prototype._onPointerMove=function(t,e){this.onPointerMoveObservable.notifyObservers(e,-1,t,this)},t.prototype._onPointerEnter=function(t){return!(this._enterCount>0)&&(-1===this._enterCount&&(this._enterCount=0),this._enterCount++,this.onPointerEnterObservable.notifyObservers(this,-1,t,this),this.pointerEnterAnimation&&this.pointerEnterAnimation(),!0)},t.prototype._onPointerOut=function(t){this._enterCount=0,this.onPointerOutObservable.notifyObservers(this,-1,t,this),this.pointerOutAnimation&&this.pointerOutAnimation()},t.prototype._onPointerDown=function(t,e,i,r){return 0===this._downCount&&(this._downCount++,this._downPointerIds[i]=!0,this.onPointerDownObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.pointerDownAnimation&&this.pointerDownAnimation(),!0)},t.prototype._onPointerUp=function(t,e,i,r,n){this._downCount=0,delete this._downPointerIds[i],n&&(this._enterCount>0||-1===this._enterCount)&&this.onPointerClickObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.onPointerUpObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.pointerUpAnimation&&this.pointerUpAnimation()},t.prototype.forcePointerUp=function(t){if(void 0===t&&(t=null),null!==t)this._onPointerUp(this,r.Vector3.Zero(),t,0,!0);else for(var e in this._downPointerIds)this._onPointerUp(this,r.Vector3.Zero(),+e,0,!0)},t.prototype._processObservables=function(t,e,i,o){if(t===r.PointerEventTypes.POINTERMOVE){this._onPointerMove(this,e);var n=this._host._lastControlOver[i];return n&&n!==this&&n._onPointerOut(this),n!==this&&this._onPointerEnter(this),this._host._lastControlOver[i]=this,!0}return t===r.PointerEventTypes.POINTERDOWN?(this._onPointerDown(this,e,i,o),this._host._lastControlDown[i]=this,this._host._lastPickedControl=this,!0):t===r.PointerEventTypes.POINTERUP&&(this._host._lastControlDown[i]&&this._host._lastControlDown[i]._onPointerUp(this,e,i,o,!0),delete this._host._lastControlDown[i],!0)},t.prototype._disposeNode=function(){this._node&&(this._node.dispose(),this._node=null)},t.prototype.dispose=function(){this.onPointerDownObservable.clear(),this.onPointerEnterObservable.clear(),this.onPointerMoveObservable.clear(),this.onPointerOutObservable.clear(),this.onPointerUpObservable.clear(),this.onPointerClickObservable.clear(),this._disposeNode();for(var t=0,e=this._behaviors;t<e.length;t++){e[t].detach()}},t}();e.Control3D=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(24),n=i(0),s=i(12),a=function(t){function e(e){var i=t.call(this,e)||this;return i._contentResolution=512,i._contentScaleRatio=2,i.pointerEnterAnimation=function(){i.mesh&&(i._currentMaterial.emissiveColor=n.Color3.Red())},i.pointerOutAnimation=function(){i._currentMaterial.emissiveColor=n.Color3.Black()},i.pointerDownAnimation=function(){i.mesh&&i.mesh.scaling.scaleInPlace(.95)},i.pointerUpAnimation=function(){i.mesh&&i.mesh.scaling.scaleInPlace(1/.95)},i}return r(e,t),Object.defineProperty(e.prototype,"contentResolution",{get:function(){return this._contentResolution},set:function(t){this._contentResolution!==t&&(this._contentResolution=t,this._resetContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"contentScaleRatio",{get:function(){return this._contentScaleRatio},set:function(t){this._contentScaleRatio!==t&&(this._contentScaleRatio=t,this._resetContent())},enumerable:!0,configurable:!0}),e.prototype._disposeFacadeTexture=function(){this._facadeTexture&&(this._facadeTexture.dispose(),this._facadeTexture=null)},e.prototype._resetContent=function(){this._disposeFacadeTexture(),this.content=this._content},Object.defineProperty(e.prototype,"content",{get:function(){return this._content},set:function(t){this._content=t,this._host&&this._host.utilityLayer&&(this._facadeTexture||(this._facadeTexture=new s.AdvancedDynamicTexture("Facade",this._contentResolution,this._contentResolution,this._host.utilityLayer.utilityLayerScene,!0,n.Texture.TRILINEAR_SAMPLINGMODE),this._facadeTexture.rootContainer.scaleX=this._contentScaleRatio,this._facadeTexture.rootContainer.scaleY=this._contentScaleRatio,this._facadeTexture.premulAlpha=!0),this._facadeTexture.addControl(t),this._applyFacade(this._facadeTexture))},enumerable:!0,configurable:!0}),e.prototype._applyFacade=function(t){this._currentMaterial.emissiveTexture=t},e.prototype._getTypeName=function(){return"Button3D"},e.prototype._createNode=function(t){for(var e=new Array(6),i=0;i<6;i++)e[i]=new n.Vector4(0,0,0,0);return e[1]=new n.Vector4(0,0,1,1),n.MeshBuilder.CreateBox(this.name+"_rootMesh",{width:1,height:1,depth:.08,faceUV:e},t)},e.prototype._affectMaterial=function(t){var e=new n.StandardMaterial(this.name+"Material",t.getScene());e.specularColor=n.Color3.Black(),t.material=e,this._currentMaterial=e,this._resetContent()},e.prototype.dispose=function(){t.prototype.dispose.call(this),this._disposeFacadeTexture(),this._currentMaterial&&this._currentMaterial.dispose()},e}(o.AbstractButton3D);e.Button3D=a},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(29)),r(i(40))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(10),n=i(1),s=i(5),a=i(11),h=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i.thickness=1,i.isPointerBlocker=!0,i.pointerEnterAnimation=function(){i.alpha-=.1},i.pointerOutAnimation=function(){i.alpha+=.1},i.pointerDownAnimation=function(){i.scaleX-=.05,i.scaleY-=.05},i.pointerUpAnimation=function(){i.scaleX+=.05,i.scaleY+=.05},i}return r(e,t),e.prototype._getTypeName=function(){return"Button"},e.prototype._processPicking=function(e,i,r,o,n){return!(!this.isHitTestVisible||!this.isVisible||this.notRenderable)&&(!!t.prototype.contains.call(this,e,i)&&(this._processObservables(r,e,i,o,n),!0))},e.prototype._onPointerEnter=function(e){return!!t.prototype._onPointerEnter.call(this,e)&&(this.pointerEnterAnimation&&this.pointerEnterAnimation(),!0)},e.prototype._onPointerOut=function(e){this.pointerOutAnimation&&this.pointerOutAnimation(),t.prototype._onPointerOut.call(this,e)},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.pointerDownAnimation&&this.pointerDownAnimation(),!0)},e.prototype._onPointerUp=function(e,i,r,o,n){this.pointerUpAnimation&&this.pointerUpAnimation(),t.prototype._onPointerUp.call(this,e,i,r,o,n)},e.CreateImageButton=function(t,i,r){var o=new e(t),h=new s.TextBlock(t+"_button",i);h.textWrapping=!0,h.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,h.paddingLeft="20%",o.addControl(h);var l=new a.Image(t+"_icon",r);return l.width="20%",l.stretch=a.Image.STRETCH_UNIFORM,l.horizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_LEFT,o.addControl(l),o},e.CreateImageOnlyButton=function(t,i){var r=new e(t),o=new a.Image(t+"_icon",i);return o.stretch=a.Image.STRETCH_FILL,o.horizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_LEFT,r.addControl(o),r},e.CreateSimpleButton=function(t,i){var r=new e(t),o=new s.TextBlock(t+"_button",i);return o.textWrapping=!0,o.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,r.addControl(o),r},e.CreateImageWithCenterTextButton=function(t,i,r){var o=new e(t),h=new a.Image(t+"_icon",r);h.stretch=a.Image.STRETCH_FILL,o.addControl(h);var l=new s.TextBlock(t+"_button",i);return l.textWrapping=!0,l.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,o.addControl(l),o},e}(o.Rectangle);e.Button=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=function(t){function e(e,i){void 0===i&&(i=0);var r=t.call(this,e.x,e.y)||this;return r.buttonIndex=i,r}return r(e,t),e}(o.Vector2);e.Vector2WithInfo=n;var s=function(){function t(t,e,i,r,o,n){this.m=new Float32Array(6),this.fromValues(t,e,i,r,o,n)}return t.prototype.fromValues=function(t,e,i,r,o,n){return this.m[0]=t,this.m[1]=e,this.m[2]=i,this.m[3]=r,this.m[4]=o,this.m[5]=n,this},t.prototype.determinant=function(){return this.m[0]*this.m[3]-this.m[1]*this.m[2]},t.prototype.invertToRef=function(t){var e=this.m[0],i=this.m[1],r=this.m[2],n=this.m[3],s=this.m[4],a=this.m[5],h=this.determinant();if(h<o.Epsilon*o.Epsilon)return t.m[0]=0,t.m[1]=0,t.m[2]=0,t.m[3]=0,t.m[4]=0,t.m[5]=0,this;var l=1/h,u=r*a-n*s,c=i*s-e*a;return t.m[0]=n*l,t.m[1]=-i*l,t.m[2]=-r*l,t.m[3]=e*l,t.m[4]=u*l,t.m[5]=c*l,this},t.prototype.multiplyToRef=function(t,e){var i=this.m[0],r=this.m[1],o=this.m[2],n=this.m[3],s=this.m[4],a=this.m[5],h=t.m[0],l=t.m[1],u=t.m[2],c=t.m[3],_=t.m[4],f=t.m[5];return e.m[0]=i*h+r*u,e.m[1]=i*l+r*c,e.m[2]=o*h+n*u,e.m[3]=o*l+n*c,e.m[4]=s*h+a*u+_,e.m[5]=s*l+a*c+f,this},t.prototype.transformCoordinates=function(t,e,i){return i.x=t*this.m[0]+e*this.m[2]+this.m[4],i.y=t*this.m[1]+e*this.m[3]+this.m[5],this},t.Identity=function(){return new t(1,0,0,1,0,0)},t.TranslationToRef=function(t,e,i){i.fromValues(1,0,0,1,t,e)},t.ScalingToRef=function(t,e,i){i.fromValues(t,0,0,e,0,0)},t.RotationToRef=function(t,e){var i=Math.sin(t),r=Math.cos(t);e.fromValues(r,i,-i,r,0,0)},t.ComposeToRef=function(e,i,r,o,n,s,a){t.TranslationToRef(e,i,t._TempPreTranslationMatrix),t.ScalingToRef(o,n,t._TempScalingMatrix),t.RotationToRef(r,t._TempRotationMatrix),t.TranslationToRef(-e,-i,t._TempPostTranslationMatrix),t._TempPreTranslationMatrix.multiplyToRef(t._TempScalingMatrix,t._TempCompose0),t._TempCompose0.multiplyToRef(t._TempRotationMatrix,t._TempCompose1),s?(t._TempCompose1.multiplyToRef(t._TempPostTranslationMatrix,t._TempCompose2),t._TempCompose2.multiplyToRef(s,a)):t._TempCompose1.multiplyToRef(t._TempPostTranslationMatrix,a)},t._TempPreTranslationMatrix=t.Identity(),t._TempPostTranslationMatrix=t.Identity(),t._TempRotationMatrix=t.Identity(),t._TempScalingMatrix=t.Identity(),t._TempCompose0=t.Identity(),t._TempCompose1=t.Identity(),t._TempCompose2=t.Identity(),t}();e.Matrix2D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=i(6),a=i(5),h=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isChecked=!1,i._background="black",i._checkSizeRatio=.8,i._thickness=1,i.onIsCheckedChangedObservable=new n.Observable,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"checkSizeRatio",{get:function(){return this._checkSizeRatio},set:function(t){t=Math.max(Math.min(1,t),0),this._checkSizeRatio!==t&&(this._checkSizeRatio=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isChecked",{get:function(){return this._isChecked},set:function(t){this._isChecked!==t&&(this._isChecked=t,this._markAsDirty(),this.onIsCheckedChangedObservable.notifyObservers(t))},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"CheckBox"},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=this._currentMeasure.width-this._thickness,r=this._currentMeasure.height-this._thickness;if((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fillRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,i,r),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._isChecked){e.fillStyle=this._isEnabled?this.color:this._disabledColor;var o=i*this._checkSizeRatio,n=r*this._checkSizeRatio;e.fillRect(this._currentMeasure.left+this._thickness/2+(i-o)/2,this._currentMeasure.top+this._thickness/2+(r-n)/2,o,n)}e.strokeStyle=this.color,e.lineWidth=this._thickness,e.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,i,r)}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.isChecked=!this.isChecked,!0)},e.AddCheckBoxWithHeader=function(t,i){var r=new s.StackPanel;r.isVertical=!1,r.height="30px";var n=new e;n.width="20px",n.height="20px",n.isChecked=!0,n.color="green",n.onIsCheckedChangedObservable.add(i),r.addControl(n);var h=new a.TextBlock;return h.text=t,h.width="180px",h.paddingLeft="5px",h.textHorizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,h.color="white",r.addControl(h),r},e}(o.Control);e.Checkbox=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e,i){void 0===i&&(i="");var r=t.call(this,e)||this;return r.name=e,r._text="",r._placeholderText="",r._background="#222222",r._focusedBackground="#000000",r._placeholderColor="gray",r._thickness=1,r._margin=new n.ValueAndUnit(10,n.ValueAndUnit.UNITMODE_PIXEL),r._autoStretchWidth=!0,r._maxWidth=new n.ValueAndUnit(1,n.ValueAndUnit.UNITMODE_PERCENTAGE,!1),r._isFocused=!1,r._blinkIsEven=!1,r._cursorOffset=0,r._deadKey=!1,r._addKey=!0,r._currentKey="",r.promptMessage="Please enter text:",r.onTextChangedObservable=new s.Observable,r.onBeforeKeyAddObservable=new s.Observable,r.onFocusObservable=new s.Observable,r.onBlurObservable=new s.Observable,r.text=i,r}return r(e,t),Object.defineProperty(e.prototype,"maxWidth",{get:function(){return this._maxWidth.toString(this._host)},set:function(t){this._maxWidth.toString(this._host)!==t&&this._maxWidth.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"maxWidthInPixels",{get:function(){return this._maxWidth.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"margin",{get:function(){return this._margin.toString(this._host)},set:function(t){this._margin.toString(this._host)!==t&&this._margin.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"marginInPixels",{get:function(){return this._margin.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"autoStretchWidth",{get:function(){return this._autoStretchWidth},set:function(t){this._autoStretchWidth!==t&&(this._autoStretchWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"focusedBackground",{get:function(){return this._focusedBackground},set:function(t){this._focusedBackground!==t&&(this._focusedBackground=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"placeholderColor",{get:function(){return this._placeholderColor},set:function(t){this._placeholderColor!==t&&(this._placeholderColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"placeholderText",{get:function(){return this._placeholderText},set:function(t){this._placeholderText!==t&&(this._placeholderText=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"deadKey",{get:function(){return this._deadKey},set:function(t){this._deadKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"addKey",{get:function(){return this._addKey},set:function(t){this._addKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"currentKey",{get:function(){return this._currentKey},set:function(t){this._currentKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._markAsDirty(),this.onTextChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._width.toString(this._host)!==t&&(this._width.fromString(t)&&this._markAsDirty(),this.autoStretchWidth=!1)},enumerable:!0,configurable:!0}),e.prototype.onBlur=function(){this._isFocused=!1,this._scrollLeft=null,this._cursorOffset=0,clearTimeout(this._blinkTimeout),this._markAsDirty(),this.onBlurObservable.notifyObservers(this)},e.prototype.onFocus=function(){if(this._isEnabled&&(this._scrollLeft=null,this._isFocused=!0,this._blinkIsEven=!1,this._cursorOffset=0,this._markAsDirty(),this.onFocusObservable.notifyObservers(this),-1!==navigator.userAgent.indexOf("Mobile"))){var t=prompt(this.promptMessage);return null!==t&&(this.text=t),void(this._host.focusedControl=null)}},e.prototype._getTypeName=function(){return"InputText"},e.prototype.keepsFocusWith=function(){return this._connectedVirtualKeyboard?[this._connectedVirtualKeyboard]:null},e.prototype.processKey=function(t,e){switch(t){case 32:e=" ";break;case 8:if(this._text&&this._text.length>0)if(0===this._cursorOffset)this.text=this._text.substr(0,this._text.length-1);else(i=this._text.length-this._cursorOffset)>0&&(this.text=this._text.slice(0,i-1)+this._text.slice(i));return;case 46:if(this._text&&this._text.length>0){var i=this._text.length-this._cursorOffset;this.text=this._text.slice(0,i)+this._text.slice(i+1),this._cursorOffset--}return;case 13:return void(this._host.focusedControl=null);case 35:return this._cursorOffset=0,this._blinkIsEven=!1,void this._markAsDirty();case 36:return this._cursorOffset=this._text.length,this._blinkIsEven=!1,void this._markAsDirty();case 37:return this._cursorOffset++,this._cursorOffset>this._text.length&&(this._cursorOffset=this._text.length),this._blinkIsEven=!1,void this._markAsDirty();case 39:return this._cursorOffset--,this._cursorOffset<0&&(this._cursorOffset=0),this._blinkIsEven=!1,void this._markAsDirty();case 222:return void(this.deadKey=!0)}if(e&&(-1===t||32===t||t>47&&t<58||t>64&&t<91||t>185&&t<193||t>218&&t<223||t>95&&t<112)&&(this._currentKey=e,this.onBeforeKeyAddObservable.notifyObservers(this),e=this._currentKey,this._addKey))if(0===this._cursorOffset)this.text+=e;else{var r=this._text.length-this._cursorOffset;this.text=this._text.slice(0,r)+e+this._text.slice(r)}},e.prototype.processKeyboard=function(t){this.processKey(t.keyCode,t.key)},e.prototype._draw=function(t,e){var i=this;if(e.save(),this._applyStates(e),this._processMeasures(t,e)){(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._isFocused?this._focusedBackground&&(e.fillStyle=this._isEnabled?this._focusedBackground:this._disabledColor,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)):this._background&&(e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._fontOffset||(this._fontOffset=o.Control._GetFontOffset(e.font));var r=this._currentMeasure.left+this._margin.getValueInPixel(this._host,t.width);this.color&&(e.fillStyle=this.color);var n=this._beforeRenderText(this._text);this._isFocused||this._text||!this._placeholderText||(n=this._placeholderText,this._placeholderColor&&(e.fillStyle=this._placeholderColor)),this._textWidth=e.measureText(n).width;var s=2*this._margin.getValueInPixel(this._host,t.width);this._autoStretchWidth&&(this.width=Math.min(this._maxWidth.getValueInPixel(this._host,t.width),this._textWidth+s)+"px");var a=this._fontOffset.ascent+(this._currentMeasure.height-this._fontOffset.height)/2,h=this._width.getValueInPixel(this._host,t.width)-s;if(e.save(),e.beginPath(),e.rect(r,this._currentMeasure.top+(this._currentMeasure.height-this._fontOffset.height)/2,h+2,this._currentMeasure.height),e.clip(),this._isFocused&&this._textWidth>h){var l=r-this._textWidth+h;this._scrollLeft||(this._scrollLeft=l)}else this._scrollLeft=r;if(e.fillText(n,this._scrollLeft,this._currentMeasure.top+a),this._isFocused){if(this._clickedCoordinate){var u=this._scrollLeft+this._textWidth-this._clickedCoordinate,c=0;this._cursorOffset=0;var _=0;do{this._cursorOffset&&(_=Math.abs(u-c)),this._cursorOffset++,c=e.measureText(n.substr(n.length-this._cursorOffset,this._cursorOffset)).width}while(c<u&&n.length>=this._cursorOffset);Math.abs(u-c)>_&&this._cursorOffset--,this._blinkIsEven=!1,this._clickedCoordinate=null}if(!this._blinkIsEven){var f=this.text.substr(this._text.length-this._cursorOffset),p=e.measureText(f).width,d=this._scrollLeft+this._textWidth-p;d<r?(this._scrollLeft+=r-d,d=r,this._markAsDirty()):d>r+h&&(this._scrollLeft+=r+h-d,d=r+h,this._markAsDirty()),e.fillRect(d,this._currentMeasure.top+(this._currentMeasure.height-this._fontOffset.height)/2,2,this._fontOffset.height)}clearTimeout(this._blinkTimeout),this._blinkTimeout=setTimeout(function(){i._blinkIsEven=!i._blinkIsEven,i._markAsDirty()},500)}e.restore(),this._thickness&&(this.color&&(e.strokeStyle=this.color),e.lineWidth=this._thickness,e.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,this._currentMeasure.width-this._thickness,this._currentMeasure.height-this._thickness))}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._clickedCoordinate=i.x,this._host.focusedControl===this?(clearTimeout(this._blinkTimeout),this._markAsDirty(),!0):!!this._isEnabled&&(this._host.focusedControl=this,!0))},e.prototype._onPointerUp=function(e,i,r,o,n){t.prototype._onPointerUp.call(this,e,i,r,o,n)},e.prototype._beforeRenderText=function(t){return t},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.onBlurObservable.clear(),this.onFocusObservable.clear(),this.onTextChangedObservable.clear()},e}(o.Control);e.InputText=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(2),o=i(0),n=function(){function t(t){this._multiLine=t,this._x=new r.ValueAndUnit(0),this._y=new r.ValueAndUnit(0),this._point=new o.Vector2(0,0)}return Object.defineProperty(t.prototype,"x",{get:function(){return this._x.toString(this._multiLine._host)},set:function(t){this._x.toString(this._multiLine._host)!==t&&this._x.fromString(t)&&this._multiLine._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"y",{get:function(){return this._y.toString(this._multiLine._host)},set:function(t){this._y.toString(this._multiLine._host)!==t&&this._y.fromString(t)&&this._multiLine._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"control",{get:function(){return this._control},set:function(t){this._control!==t&&(this._control&&this._controlObserver&&(this._control.onDirtyObservable.remove(this._controlObserver),this._controlObserver=null),this._control=t,this._control&&(this._controlObserver=this._control.onDirtyObservable.add(this._multiLine.onPointUpdate)),this._multiLine._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"mesh",{get:function(){return this._mesh},set:function(t){this._mesh!==t&&(this._mesh&&this._meshObserver&&this._mesh.getScene().onAfterCameraRenderObservable.remove(this._meshObserver),this._mesh=t,this._mesh&&(this._meshObserver=this._mesh.getScene().onAfterCameraRenderObservable.add(this._multiLine.onPointUpdate)),this._multiLine._markAsDirty())},enumerable:!0,configurable:!0}),t.prototype.resetLinks=function(){this.control=null,this.mesh=null},t.prototype.translate=function(){return this._point=this._translatePoint(),this._point},t.prototype._translatePoint=function(){if(null!=this._mesh)return this._multiLine._host.getProjectedPosition(this._mesh.getBoundingInfo().boundingSphere.center,this._mesh.getWorldMatrix());if(null!=this._control)return new o.Vector2(this._control.centerX,this._control.centerY);var t=this._multiLine._host,e=this._x.getValueInPixel(t,Number(t._canvas.width)),i=this._y.getValueInPixel(t,Number(t._canvas.height));return new o.Vector2(e,i)},t.prototype.dispose=function(){this.resetLinks()},t}();e.MultiLinePoint=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=i(9),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isChecked=!1,i._background="black",i._checkSizeRatio=.8,i._thickness=1,i.group="",i.onIsCheckedChangedObservable=new n.Observable,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"checkSizeRatio",{get:function(){return this._checkSizeRatio},set:function(t){t=Math.max(Math.min(1,t),0),this._checkSizeRatio!==t&&(this._checkSizeRatio=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isChecked",{get:function(){return this._isChecked},set:function(t){var e=this;this._isChecked!==t&&(this._isChecked=t,this._markAsDirty(),this.onIsCheckedChangedObservable.notifyObservers(t),this._isChecked&&this._host&&this._host.executeOnAllControls(function(t){if(t!==e&&void 0!==t.group){var i=t;i.group===e.group&&(i.isChecked=!1)}}))},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"RadioButton"},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=this._currentMeasure.width-this._thickness,r=this._currentMeasure.height-this._thickness;if((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),o.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2-this._thickness/2,this._currentMeasure.height/2-this._thickness/2,e),e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fill(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this.color,e.lineWidth=this._thickness,e.stroke(),this._isChecked){e.fillStyle=this._isEnabled?this.color:this._disabledColor;var n=i*this._checkSizeRatio,s=r*this._checkSizeRatio;o.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,n/2-this._thickness/2,s/2-this._thickness/2,e),e.fill()}}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.isChecked||(this.isChecked=!0),!0)},e.AddRadioButtonWithHeader=function(t,i,r,n){var a=new s.StackPanel;a.isVertical=!1,a.height="30px";var h=new e;h.width="20px",h.height="20px",h.isChecked=r,h.color="green",h.group=i,h.onIsCheckedChangedObservable.add(function(t){return n(h,t)}),a.addControl(h);var l=new s.TextBlock;return l.text=t,l.width="180px",l.paddingLeft="5px",l.textHorizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,l.color="white",a.addControl(l),a},e}(o.Control);e.RadioButton=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thumbWidth=new n.ValueAndUnit(20,n.ValueAndUnit.UNITMODE_PIXEL,!1),i._minimum=0,i._maximum=100,i._value=50,i._isVertical=!1,i._background="black",i._borderColor="white",i._barOffset=new n.ValueAndUnit(5,n.ValueAndUnit.UNITMODE_PIXEL,!1),i._isThumbCircle=!1,i._isThumbClamped=!1,i.onValueChangedObservable=new s.Observable,i._pointerIsDown=!1,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"borderColor",{get:function(){return this._borderColor},set:function(t){this._borderColor!==t&&(this._borderColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"barOffset",{get:function(){return this._barOffset.toString(this._host)},set:function(t){this._barOffset.toString(this._host)!==t&&this._barOffset.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"barOffsetInPixels",{get:function(){return this._barOffset.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thumbWidth",{get:function(){return this._thumbWidth.toString(this._host)},set:function(t){this._thumbWidth.toString(this._host)!==t&&this._thumbWidth.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thumbWidthInPixels",{get:function(){return this._thumbWidth.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minimum",{get:function(){return this._minimum},set:function(t){this._minimum!==t&&(this._minimum=t,this._markAsDirty(),this.value=Math.max(Math.min(this.value,this._maximum),this._minimum))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"maximum",{get:function(){return this._maximum},set:function(t){this._maximum!==t&&(this._maximum=t,this._markAsDirty(),this.value=Math.max(Math.min(this.value,this._maximum),this._minimum))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"value",{get:function(){return this._value},set:function(t){t=Math.max(Math.min(t,this._maximum),this._minimum),this._value!==t&&(this._value=t,this._markAsDirty(),this.onValueChangedObservable.notifyObservers(this._value))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){this._isVertical!==t&&(this._isVertical=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isThumbCircle",{get:function(){return this._isThumbCircle},set:function(t){this._isThumbCircle!==t&&(this._isThumbCircle=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isThumbClamped",{get:function(){return this._isThumbClamped},set:function(t){this._isThumbClamped!==t&&(this._isThumbClamped=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Slider"},e.prototype._getThumbThickness=function(t,e){var i=0;switch(t){case"circle":i=this._thumbWidth.isPixel?Math.max(this._thumbWidth.getValue(this._host),e):e*this._thumbWidth.getValue(this._host);break;case"rectangle":i=this._thumbWidth.isPixel?Math.min(this._thumbWidth.getValue(this._host),e):e*this._thumbWidth.getValue(this._host)}return i},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=0,r=this.isThumbCircle?"circle":"rectangle",o=this._currentMeasure.left,n=this._currentMeasure.top,s=this._currentMeasure.width,a=this._currentMeasure.height,h=Math.max(this._currentMeasure.width,this._currentMeasure.height),l=Math.min(this._currentMeasure.width,this._currentMeasure.height),u=this._getThumbThickness(r,l);h-=u;var c=0;if(this._isVertical&&this._currentMeasure.height<this._currentMeasure.width)return void console.error("Height should be greater than width");l-=2*(i=this._barOffset.isPixel?Math.min(this._barOffset.getValue(this._host),l):l*this._barOffset.getValue(this._host)),this._isVertical?(o+=i,this.isThumbClamped||(n+=u/2),a=h,s=l):(n+=i,this.isThumbClamped||(o+=u/2),a=l,s=h),this.isThumbClamped&&this.isThumbCircle?(this._isVertical?n+=u/2:o+=u/2,c=l/2):c=(u-i)/2,(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY);var _=this._isVertical?(this._maximum-this._value)/(this._maximum-this._minimum)*h:(this._value-this._minimum)/(this._maximum-this._minimum)*h;e.fillStyle=this._background,this._isVertical?this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+l/2,n,c,Math.PI,2*Math.PI),e.fill(),e.fillRect(o,n,s,a)):e.fillRect(o,n,s,a+u):e.fillRect(o,n,s,a):this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+h,n+l/2,c,0,2*Math.PI),e.fill(),e.fillRect(o,n,s,a)):e.fillRect(o,n,s+u,a):e.fillRect(o,n,s,a),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.fillStyle=this.color,this._isVertical?this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+l/2,n+h,c,0,2*Math.PI),e.fill(),e.fillRect(o,n+_,s,a-_)):e.fillRect(o,n+_,s,this._currentMeasure.height-_):e.fillRect(o,n+_,s,a-_):this.isThumbClamped&&this.isThumbCircle?(e.beginPath(),e.arc(o,n+l/2,c,0,2*Math.PI),e.fill(),e.fillRect(o,n,_,a)):e.fillRect(o,n,_,a),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._isThumbCircle?(e.beginPath(),this._isVertical?e.arc(o+l/2,n+_,c,0,2*Math.PI):e.arc(o+_,n+l/2,c,0,2*Math.PI),e.fill(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this._borderColor,e.stroke()):(this._isVertical?e.fillRect(o-i,this._currentMeasure.top+_,this._currentMeasure.width,u):e.fillRect(this._currentMeasure.left+_,this._currentMeasure.top,u,this._currentMeasure.height),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this._borderColor,this._isVertical?e.strokeRect(o-i,this._currentMeasure.top+_,this._currentMeasure.width,u):e.strokeRect(this._currentMeasure.left+_,this._currentMeasure.top,u,this._currentMeasure.height))}e.restore()},e.prototype._updateValueFromPointer=function(t,e){0!=this.rotation&&(this._invertTransformMatrix.transformCoordinates(t,e,this._transformedPosition),t=this._transformedPosition.x,e=this._transformedPosition.y),this._isVertical?this.value=this._minimum+(1-(e-this._currentMeasure.top)/this._currentMeasure.height)*(this._maximum-this._minimum):this.value=this._minimum+(t-this._currentMeasure.left)/this._currentMeasure.width*(this._maximum-this._minimum)},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._pointerIsDown=!0,this._updateValueFromPointer(i.x,i.y),this._host._capturingControl[r]=this,!0)},e.prototype._onPointerMove=function(e,i){this._pointerIsDown&&this._updateValueFromPointer(i.x,i.y),t.prototype._onPointerMove.call(this,e,i)},e.prototype._onPointerUp=function(e,i,r,o,n){this._pointerIsDown=!1,delete this._host._capturingControl[r],t.prototype._onPointerUp.call(this,e,i,r,o,n)},e}(o.Control);e.Slider=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(2),n=function(){function t(t){this._fontFamily="Arial",this._fontStyle="",this._fontWeight="",this._fontSize=new o.ValueAndUnit(18,o.ValueAndUnit.UNITMODE_PIXEL,!1),this.onChangedObservable=new r.Observable,this._host=t}return Object.defineProperty(t.prototype,"fontSize",{get:function(){return this._fontSize.toString(this._host)},set:function(t){this._fontSize.toString(this._host)!==t&&this._fontSize.fromString(t)&&this.onChangedObservable.notifyObservers(this)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontFamily",{get:function(){return this._fontFamily},set:function(t){this._fontFamily!==t&&(this._fontFamily=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontStyle",{get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontWeight",{get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),t.prototype.dispose=function(){this.onChangedObservable.clear()},t}();e.Style=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(13),n=i(0),s=function(t){function e(e){return t.call(this,e)||this}return r(e,t),e.prototype._getTypeName=function(){return"AbstractButton3D"},e.prototype._createNode=function(t){return new n.TransformNode("button"+this.name)},e}(o.Control3D);e.AbstractButton3D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e,i){void 0===i&&(i=0);var r=t.call(this,e.x,e.y,e.z)||this;return r.buttonIndex=i,r}return r(e,t),e}(i(0).Vector3);e.Vector3WithInfo=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}(),o=this&&this.__decorate||function(t,e,i,r){var o,n=arguments.length,s=n<3?e:null===r?r=Object.getOwnPropertyDescriptor(e,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(t,e,i,r);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(s=(n<3?o(s):n>3?o(e,i,s):o(e,i))||s);return n>3&&s&&Object.defineProperty(e,i,s),s};Object.defineProperty(e,"__esModule",{value:!0});var n=i(0);i(44).registerShader();var s=function(t){function e(){var e=t.call(this)||this;return e.INNERGLOW=!1,e.BORDER=!1,e.HOVERLIGHT=!1,e.TEXTURE=!1,e.rebuild(),e}return r(e,t),e}(n.MaterialDefines);e.FluentMaterialDefines=s;var a=function(t){function e(e,i){var r=t.call(this,e,i)||this;return r.innerGlowColorIntensity=.5,r.innerGlowColor=new n.Color3(1,1,1),r.alpha=1,r.albedoColor=new n.Color3(.3,.35,.4),r.renderBorders=!1,r.borderWidth=.5,r.edgeSmoothingValue=.02,r.borderMinValue=.1,r.renderHoverLight=!1,r.hoverRadius=1,r.hoverColor=new n.Color4(.3,.3,.3,1),r.hoverPosition=n.Vector3.Zero(),r}return r(e,t),e.prototype.needAlphaBlending=function(){return 1!==this.alpha},e.prototype.needAlphaTesting=function(){return!1},e.prototype.getAlphaTestTexture=function(){return null},e.prototype.isReadyForSubMesh=function(t,e,i){if(this.isFrozen&&this._wasPreviouslyReady&&e.effect)return!0;e._materialDefines||(e._materialDefines=new s);var r=this.getScene(),o=e._materialDefines;if(!this.checkReadyOnEveryCall&&e.effect&&o._renderId===r.getRenderId())return!0;if(o._areTexturesDirty)if(o.INNERGLOW=this.innerGlowColorIntensity>0,o.BORDER=this.renderBorders,o.HOVERLIGHT=this.renderHoverLight,this._albedoTexture){if(!this._albedoTexture.isReadyOrNotBlocking())return!1;o.TEXTURE=!0}else o.TEXTURE=!1;var a=r.getEngine();if(o.isDirty){o.markAsProcessed(),r.resetCachedMaterial();var h=[n.VertexBuffer.PositionKind];h.push(n.VertexBuffer.NormalKind),h.push(n.VertexBuffer.UVKind);var l=["world","viewProjection","innerGlowColor","albedoColor","borderWidth","edgeSmoothingValue","scaleFactor","borderMinValue","hoverColor","hoverPosition","hoverRadius"],u=["albedoSampler"],c=new Array;n.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:l,uniformBuffersNames:c,samplers:u,defines:o,maxSimultaneousLights:4});var _=o.toString();e.setEffect(r.getEngine().createEffect("fluent",{attributes:h,uniformsNames:l,uniformBuffersNames:c,samplers:u,defines:_,fallbacks:null,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:4}},a))}return!(!e.effect||!e.effect.isReady())&&(o._renderId=r.getRenderId(),this._wasPreviouslyReady=!0,!0)},e.prototype.bindForSubMesh=function(t,e,i){var r=this.getScene(),o=i._materialDefines;if(o){var s=i.effect;s&&(this._activeEffect=s,this.bindOnlyWorldMatrix(t),this._activeEffect.setMatrix("viewProjection",r.getTransformMatrix()),this._mustRebind(r,s)&&(this._activeEffect.setColor4("albedoColor",this.albedoColor,this.alpha),o.INNERGLOW&&this._activeEffect.setColor4("innerGlowColor",this.innerGlowColor,this.innerGlowColorIntensity),o.BORDER&&(this._activeEffect.setFloat("borderWidth",this.borderWidth),this._activeEffect.setFloat("edgeSmoothingValue",this.edgeSmoothingValue),this._activeEffect.setFloat("borderMinValue",this.borderMinValue),e.getBoundingInfo().boundingBox.extendSize.multiplyToRef(e.scaling,n.Tmp.Vector3[0]),this._activeEffect.setVector3("scaleFactor",n.Tmp.Vector3[0])),o.HOVERLIGHT&&(this._activeEffect.setDirectColor4("hoverColor",this.hoverColor),this._activeEffect.setFloat("hoverRadius",this.hoverRadius),this._activeEffect.setVector3("hoverPosition",this.hoverPosition)),o.TEXTURE&&this._activeEffect.setTexture("albedoSampler",this._albedoTexture)),this._afterBind(e,this._activeEffect))}},e.prototype.getActiveTextures=function(){return t.prototype.getActiveTextures.call(this)},e.prototype.hasTexture=function(e){return!!t.prototype.hasTexture.call(this,e)},e.prototype.dispose=function(e){t.prototype.dispose.call(this,e)},e.prototype.clone=function(t){var i=this;return n.SerializationHelper.Clone(function(){return new e(t,i.getScene())},this)},e.prototype.serialize=function(){var t=n.SerializationHelper.Serialize(this);return t.customType="BABYLON.GUI.FluentMaterial",t},e.prototype.getClassName=function(){return"FluentMaterial"},e.Parse=function(t,i,r){return n.SerializationHelper.Parse(function(){return new e(t.name,i)},t,i,r)},o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"innerGlowColorIntensity",void 0),o([n.serializeAsColor3()],e.prototype,"innerGlowColor",void 0),o([n.serialize()],e.prototype,"alpha",void 0),o([n.serializeAsColor3()],e.prototype,"albedoColor",void 0),o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"renderBorders",void 0),o([n.serialize()],e.prototype,"borderWidth",void 0),o([n.serialize()],e.prototype,"edgeSmoothingValue",void 0),o([n.serialize()],e.prototype,"borderMinValue",void 0),o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"renderHoverLight",void 0),o([n.serialize()],e.prototype,"hoverRadius",void 0),o([n.serializeAsColor4()],e.prototype,"hoverColor",void 0),o([n.serializeAsVector3()],e.prototype,"hoverPosition",void 0),o([n.serializeAsTexture("albedoTexture")],e.prototype,"_albedoTexture",void 0),o([n.expandToProperty("_markAllSubMeshesAsTexturesAndMiscDirty")],e.prototype,"albedoTexture",void 0),e}(n.PushMaterial);e.FluentMaterial=a},function(t,e,i){"use strict";(function(t){Object.defineProperty(e,"__esModule",{value:!0});var r=i(15),o=void 0!==t?t:"undefined"!=typeof window?window:void 0;void 0!==o&&(o.BABYLON=o.BABYLON||{},o.BABYLON.GUI=r),function(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}(i(15))}).call(this,i(28))},function(t,e){var i;i=function(){return this}();try{i=i||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(i=window)}t.exports=i},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(9)),r(i(12)),r(i(17)),r(i(7)),r(i(20)),r(i(23)),r(i(2))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._value=n.Color3.Red(),i._tmpColor=new n.Color3,i._pointerStartedOnSquare=!1,i._pointerStartedOnWheel=!1,i._squareLeft=0,i._squareTop=0,i._squareSize=0,i._h=360,i._s=1,i._v=1,i.onValueChangedObservable=new n.Observable,i._pointerIsDown=!1,i.value=new n.Color3(.88,.1,.1),i.size="200px",i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"value",{get:function(){return this._value},set:function(t){this._value.equals(t)||(this._value.copyFrom(t),this._RGBtoHSV(this._value,this._tmpColor),this._h=this._tmpColor.r,this._s=Math.max(this._tmpColor.g,1e-5),this._v=Math.max(this._tmpColor.b,1e-5),this._markAsDirty(),this.onValueChangedObservable.notifyObservers(this._value))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{set:function(t){this._width.toString(this._host)!==t&&this._width.fromString(t)&&(this._height.fromString(t),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"height",{set:function(t){this._height.toString(this._host)!==t&&this._height.fromString(t)&&(this._width.fromString(t),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"size",{get:function(){return this.width},set:function(t){this.width=t},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"ColorPicker"},e.prototype._updateSquareProps=function(){var t=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),e=2*(t-.2*t)/Math.sqrt(2),i=t-.5*e;this._squareLeft=this._currentMeasure.left+i,this._squareTop=this._currentMeasure.top+i,this._squareSize=e},e.prototype._drawGradientSquare=function(t,e,i,r,o,n){var s=n.createLinearGradient(e,i,r+e,i);s.addColorStop(0,"#fff"),s.addColorStop(1,"hsl("+t+", 100%, 50%)"),n.fillStyle=s,n.fillRect(e,i,r,o);var a=n.createLinearGradient(e,i,e,o+i);a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(1,"#000"),n.fillStyle=a,n.fillRect(e,i,r,o)},e.prototype._drawCircle=function(t,e,i,r){r.beginPath(),r.arc(t,e,i+1,0,2*Math.PI,!1),r.lineWidth=3,r.strokeStyle="#333333",r.stroke(),r.beginPath(),r.arc(t,e,i,0,2*Math.PI,!1),r.lineWidth=3,r.strokeStyle="#ffffff",r.stroke()},e.prototype._createColorWheelCanvas=function(t,e){var i=document.createElement("canvas");i.width=2*t,i.height=2*t;for(var r=i.getContext("2d"),o=r.getImageData(0,0,2*t,2*t),n=o.data,s=this._tmpColor,a=t*t,h=t-e,l=h*h,u=-t;u<t;u++)for(var c=-t;c<t;c++){var _=u*u+c*c;if(!(_>a||_<l)){var f=Math.sqrt(_),p=Math.atan2(c,u);this._HSVtoRGB(180*p/Math.PI+180,f/t,1,s);var d=4*(u+t+2*(c+t)*t);n[d]=255*s.r,n[d+1]=255*s.g,n[d+2]=255*s.b;var y=.2;y=t<50?.2:t>150?.04:-.16*(t-50)/100+.2;var g=(f-h)/(t-h);n[d+3]=g<y?g/y*255:g>1-y?255*(1-(g-(1-y))/y):255}}return r.putImageData(o,0,0),i},e.prototype._RGBtoHSV=function(t,e){var i=t.r,r=t.g,o=t.b,n=Math.max(i,r,o),s=Math.min(i,r,o),a=0,h=0,l=n,u=n-s;0!==n&&(h=u/n),n!=s&&(n==i?(a=(r-o)/u,r<o&&(a+=6)):n==r?a=(o-i)/u+2:n==o&&(a=(i-r)/u+4),a*=60),e.r=a,e.g=h,e.b=l},e.prototype._HSVtoRGB=function(t,e,i,r){var o=i*e,n=t/60,s=o*(1-Math.abs(n%2-1)),a=0,h=0,l=0;n>=0&&n<=1?(a=o,h=s):n>=1&&n<=2?(a=s,h=o):n>=2&&n<=3?(h=o,l=s):n>=3&&n<=4?(h=s,l=o):n>=4&&n<=5?(a=s,l=o):n>=5&&n<=6&&(a=o,l=s);var u=i-o;r.set(a+u,h+u,l+u)},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),r=.2*i,o=this._currentMeasure.left,n=this._currentMeasure.top;this._colorWheelCanvas&&this._colorWheelCanvas.width==2*i||(this._colorWheelCanvas=this._createColorWheelCanvas(i,r)),this._updateSquareProps(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY,e.fillRect(this._squareLeft,this._squareTop,this._squareSize,this._squareSize)),e.drawImage(this._colorWheelCanvas,o,n),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._drawGradientSquare(this._h,this._squareLeft,this._squareTop,this._squareSize,this._squareSize,e);var s=this._squareLeft+this._squareSize*this._s,a=this._squareTop+this._squareSize*(1-this._v);this._drawCircle(s,a,.04*i,e);var h=i-.5*r;s=o+i+Math.cos((this._h-180)*Math.PI/180)*h,a=n+i+Math.sin((this._h-180)*Math.PI/180)*h,this._drawCircle(s,a,.35*r,e)}e.restore()},e.prototype._updateValueFromPointer=function(t,e){if(this._pointerStartedOnWheel){var i=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),r=i+this._currentMeasure.left,o=i+this._currentMeasure.top;this._h=180*Math.atan2(e-o,t-r)/Math.PI+180}else this._pointerStartedOnSquare&&(this._updateSquareProps(),this._s=(t-this._squareLeft)/this._squareSize,this._v=1-(e-this._squareTop)/this._squareSize,this._s=Math.min(this._s,1),this._s=Math.max(this._s,1e-5),this._v=Math.min(this._v,1),this._v=Math.max(this._v,1e-5));this._HSVtoRGB(this._h,this._s,this._v,this._tmpColor),this.value=this._tmpColor},e.prototype._isPointOnSquare=function(t){this._updateSquareProps();var e=this._squareLeft,i=this._squareTop,r=this._squareSize;return t.x>=e&&t.x<=e+r&&t.y>=i&&t.y<=i+r},e.prototype._isPointOnWheel=function(t){var e=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),i=e+this._currentMeasure.left,r=e+this._currentMeasure.top,o=e-.2*e,n=e*e,s=o*o,a=t.x-i,h=t.y-r,l=a*a+h*h;return l<=n&&l>=s},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._pointerIsDown=!0,this._pointerStartedOnSquare=!1,this._pointerStartedOnWheel=!1,this._isPointOnSquare(i)?this._pointerStartedOnSquare=!0:this._isPointOnWheel(i)&&(this._pointerStartedOnWheel=!0),this._updateValueFromPointer(i.x,i.y),this._host._capturingControl[r]=this,!0)},e.prototype._onPointerMove=function(e,i){this._pointerIsDown&&this._updateValueFromPointer(i.x,i.y),t.prototype._onPointerMove.call(this,e,i)},e.prototype._onPointerUp=function(e,i,r,o,n){this._pointerIsDown=!1,delete this._host._capturingControl[r],t.prototype._onPointerUp.call(this,e,i,r,o,n)},e}(o.Control);e.ColorPicker=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(1),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thickness=1,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Ellipse"},e.prototype._localDraw=function(t){t.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),n.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2-this._thickness/2,this._currentMeasure.height/2-this._thickness/2,t),this._background&&(t.fillStyle=this._background,t.fill()),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0),this._thickness&&(this.color&&(t.strokeStyle=this.color),t.lineWidth=this._thickness,t.stroke()),t.restore()},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.width-=2*this._thickness,this._measureForChildren.height-=2*this._thickness,this._measureForChildren.left+=this._thickness,this._measureForChildren.top+=this._thickness},e.prototype._clipForChildren=function(t){n.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2,this._currentMeasure.height/2,t),t.clip()},e}(o.Container);e.Ellipse=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(2),s=i(1),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._rowDefinitions=new Array,i._columnDefinitions=new Array,i._cells={},i._childControls=new Array,i}return r(e,t),Object.defineProperty(e.prototype,"children",{get:function(){return this._childControls},enumerable:!0,configurable:!0}),e.prototype.addRowDefinition=function(t,e){return void 0===e&&(e=!1),this._rowDefinitions.push(new n.ValueAndUnit(t,e?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE)),this._markAsDirty(),this},e.prototype.addColumnDefinition=function(t,e){return void 0===e&&(e=!1),this._columnDefinitions.push(new n.ValueAndUnit(t,e?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE)),this._markAsDirty(),this},e.prototype.setRowDefinition=function(t,e,i){return void 0===i&&(i=!1),t<0||t>=this._rowDefinitions.length?this:(this._rowDefinitions[t]=new n.ValueAndUnit(e,i?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE),this._markAsDirty(),this)},e.prototype.setColumnDefinition=function(t,e,i){return void 0===i&&(i=!1),t<0||t>=this._columnDefinitions.length?this:(this._columnDefinitions[t]=new n.ValueAndUnit(e,i?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE),this._markAsDirty(),this)},e.prototype._removeCell=function(e,i){if(e){t.prototype.removeControl.call(this,e);for(var r=0,o=e.children;r<o.length;r++){var n=o[r],s=this._childControls.indexOf(n);-1!==s&&this._childControls.splice(s,1)}delete this._cells[i]}},e.prototype._offsetCell=function(t,e){if(this._cells[e]){this._cells[t]=this._cells[e];for(var i=0,r=this._cells[t].children;i<r.length;i++){r[i]._tag=t}delete this._cells[e]}},e.prototype.removeColumnDefinition=function(t){if(t<0||t>=this._columnDefinitions.length)return this;for(var e=0;e<this._rowDefinitions.length;e++){var i=e+":"+t,r=this._cells[i];this._removeCell(r,i)}for(e=0;e<this._rowDefinitions.length;e++)for(var o=t+1;o<this._columnDefinitions.length;o++){var n=e+":"+(o-1);i=e+":"+o;this._offsetCell(n,i)}return this._columnDefinitions.splice(t,1),this._markAsDirty(),this},e.prototype.removeRowDefinition=function(t){if(t<0||t>=this._rowDefinitions.length)return this;for(var e=0;e<this._columnDefinitions.length;e++){var i=t+":"+e,r=this._cells[i];this._removeCell(r,i)}for(e=0;e<this._columnDefinitions.length;e++)for(var o=t+1;o<this._rowDefinitions.length;o++){var n=o-1+":"+e;i=o+":"+e;this._offsetCell(n,i)}return this._rowDefinitions.splice(t,1),this._markAsDirty(),this},e.prototype.addControl=function(e,i,r){void 0===i&&(i=0),void 0===r&&(r=0),0===this._rowDefinitions.length&&this.addRowDefinition(1,!1),0===this._columnDefinitions.length&&this.addColumnDefinition(1,!1);var n=Math.min(i,this._rowDefinitions.length-1)+":"+Math.min(r,this._columnDefinitions.length-1),a=this._cells[n];return a||(a=new o.Container(n),this._cells[n]=a,a.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,a.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,t.prototype.addControl.call(this,a)),a.addControl(e),this._childControls.push(e),e._tag=n,this._markAsDirty(),this},e.prototype.removeControl=function(t){var e=this._childControls.indexOf(t);-1!==e&&this._childControls.splice(e,1);var i=this._cells[t._tag];return i&&i.removeControl(t),this._markAsDirty(),this},e.prototype._getTypeName=function(){return"Grid"},e.prototype._additionalProcessing=function(e,i){for(var r=[],o=[],n=[],s=[],a=this._currentMeasure.width,h=0,l=this._currentMeasure.height,u=0,c=0,_=0,f=this._rowDefinitions;_<f.length;_++){if((b=f[_]).isPixel)l-=g=b.getValue(this._host),o[c]=g;else u+=b.internalValue;c++}var p=0;c=0;for(var d=0,y=this._rowDefinitions;d<y.length;d++){var g,b=y[d];if(s.push(p),b.isPixel)p+=b.getValue(this._host);else p+=g=b.internalValue/u*l,o[c]=g;c++}c=0;for(var m=0,v=this._columnDefinitions;m<v.length;m++){if((b=v[m]).isPixel)a-=w=b.getValue(this._host),r[c]=w;else h+=b.internalValue;c++}var O=0;c=0;for(var P=0,C=this._columnDefinitions;P<C.length;P++){var w;b=C[P];if(n.push(O),b.isPixel)O+=b.getValue(this._host);else O+=w=b.internalValue/h*a,r[c]=w;c++}for(var T in this._cells)if(this._cells.hasOwnProperty(T)){var M=T.split(":"),x=parseInt(M[0]),A=parseInt(M[1]),k=this._cells[T];k.left=n[A]+"px",k.top=s[x]+"px",k.width=r[A]+"px",k.height=o[x]+"px"}t.prototype._additionalProcessing.call(this,e,i)},e.prototype.dispose=function(){t.prototype.dispose.call(this);for(var e=0,i=this._childControls;e<i.length;e++){i[e].dispose()}},e}(o.Container);e.Grid=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype._beforeRenderText=function(t){for(var e="",i=0;i<t.length;i++)e+="•";return e},e}(i(19).InputText);e.InputPassword=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._lineWidth=1,i._x1=new n.ValueAndUnit(0),i._y1=new n.ValueAndUnit(0),i._x2=new n.ValueAndUnit(0),i._y2=new n.ValueAndUnit(0),i._dash=new Array,i.isHitTestVisible=!1,i._horizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,i._verticalAlignment=o.Control.VERTICAL_ALIGNMENT_TOP,i}return r(e,t),Object.defineProperty(e.prototype,"dash",{get:function(){return this._dash},set:function(t){this._dash!==t&&(this._dash=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"connectedControl",{get:function(){return this._connectedControl},set:function(t){var e=this;this._connectedControl!==t&&(this._connectedControlDirtyObserver&&this._connectedControl&&(this._connectedControl.onDirtyObservable.remove(this._connectedControlDirtyObserver),this._connectedControlDirtyObserver=null),t&&(this._connectedControlDirtyObserver=t.onDirtyObservable.add(function(){return e._markAsDirty()})),this._connectedControl=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"x1",{get:function(){return this._x1.toString(this._host)},set:function(t){this._x1.toString(this._host)!==t&&this._x1.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"y1",{get:function(){return this._y1.toString(this._host)},set:function(t){this._y1.toString(this._host)!==t&&this._y1.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"x2",{get:function(){return this._x2.toString(this._host)},set:function(t){this._x2.toString(this._host)!==t&&this._x2.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"y2",{get:function(){return this._y2.toString(this._host)},set:function(t){this._y2.toString(this._host)!==t&&this._y2.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"lineWidth",{get:function(){return this._lineWidth},set:function(t){this._lineWidth!==t&&(this._lineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"horizontalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"verticalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"_effectiveX2",{get:function(){return(this._connectedControl?this._connectedControl.centerX:0)+this._x2.getValue(this._host)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"_effectiveY2",{get:function(){return(this._connectedControl?this._connectedControl.centerY:0)+this._y2.getValue(this._host)},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Line"},e.prototype._draw=function(t,e){e.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._applyStates(e),this._processMeasures(t,e)&&(e.strokeStyle=this.color,e.lineWidth=this._lineWidth,e.setLineDash(this._dash),e.beginPath(),e.moveTo(this._x1.getValue(this._host),this._y1.getValue(this._host)),e.lineTo(this._effectiveX2,this._effectiveY2),e.stroke()),e.restore()},e.prototype._measure=function(){this._currentMeasure.width=Math.abs(this._x1.getValue(this._host)-this._effectiveX2)+this._lineWidth,this._currentMeasure.height=Math.abs(this._y1.getValue(this._host)-this._effectiveY2)+this._lineWidth},e.prototype._computeAlignment=function(t,e){this._currentMeasure.left=Math.min(this._x1.getValue(this._host),this._effectiveX2)-this._lineWidth/2,this._currentMeasure.top=Math.min(this._y1.getValue(this._host),this._effectiveY2)-this._lineWidth/2},e.prototype.moveToVector3=function(t,e,i){if(void 0===i&&(i=!1),this._host&&this._root===this._host._rootContainer){var r=this._host._getGlobalViewport(e),o=s.Vector3.Project(t,s.Matrix.Identity(),e.getTransformMatrix(),r);this._moveToProjectedPosition(o,i),o.z<0||o.z>1?this.notRenderable=!0:this.notRenderable=!1}else s.Tools.Error("Cannot move a control to a vector3 if the control is not at root level")},e.prototype._moveToProjectedPosition=function(t,e){void 0===e&&(e=!1);var i=t.x+this._linkOffsetX.getValue(this._host)+"px",r=t.y+this._linkOffsetY.getValue(this._host)+"px";e?(this.x2=i,this.y2=r,this._x2.ignoreAdaptiveScaling=!0,this._y2.ignoreAdaptiveScaling=!0):(this.x1=i,this.y1=r,this._x1.ignoreAdaptiveScaling=!0,this._y1.ignoreAdaptiveScaling=!0)},e}(o.Control);e.Line=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(20),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._lineWidth=1,i.onPointUpdate=function(){i._markAsDirty()},i.isHitTestVisible=!1,i._horizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,i._verticalAlignment=o.Control.VERTICAL_ALIGNMENT_TOP,i._dash=[],i._points=[],i}return r(e,t),Object.defineProperty(e.prototype,"dash",{get:function(){return this._dash},set:function(t){this._dash!==t&&(this._dash=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype.getAt=function(t){return this._points[t]||(this._points[t]=new n.MultiLinePoint(this)),this._points[t]},e.prototype.add=function(){for(var t=this,e=[],i=0;i<arguments.length;i++)e[i]=arguments[i];return e.map(function(e){return t.push(e)})},e.prototype.push=function(t){var e=this.getAt(this._points.length);return null==t?e:(t instanceof s.AbstractMesh?e.mesh=t:t instanceof o.Control?e.control=t:null!=t.x&&null!=t.y&&(e.x=t.x,e.y=t.y),e)},e.prototype.remove=function(t){var e;if(t instanceof n.MultiLinePoint){if(-1===(e=this._points.indexOf(t)))return}else e=t;var i=this._points[e];i&&(i.dispose(),this._points.splice(e,1))},e.prototype.reset=function(){for(;this._points.length>0;)this.remove(this._points.length-1)},e.prototype.resetLinks=function(){this._points.forEach(function(t){null!=t&&t.resetLinks()})},Object.defineProperty(e.prototype,"lineWidth",{get:function(){return this._lineWidth},set:function(t){this._lineWidth!==t&&(this._lineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"horizontalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"verticalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"MultiLine"},e.prototype._draw=function(t,e){if(e.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._applyStates(e),this._processMeasures(t,e)){e.strokeStyle=this.color,e.lineWidth=this._lineWidth,e.setLineDash(this._dash),e.beginPath();var i=!0;this._points.forEach(function(t){t&&(i?(e.moveTo(t._point.x,t._point.y),i=!1):e.lineTo(t._point.x,t._point.y))}),e.stroke()}e.restore()},e.prototype._additionalProcessing=function(t,e){var i=this;this._minX=null,this._minY=null,this._maxX=null,this._maxY=null,this._points.forEach(function(t,e){t&&(t.translate(),(null==i._minX||t._point.x<i._minX)&&(i._minX=t._point.x),(null==i._minY||t._point.y<i._minY)&&(i._minY=t._point.y),(null==i._maxX||t._point.x>i._maxX)&&(i._maxX=t._point.x),(null==i._maxY||t._point.y>i._maxY)&&(i._maxY=t._point.y))}),null==this._minX&&(this._minX=0),null==this._minY&&(this._minY=0),null==this._maxX&&(this._maxX=0),null==this._maxY&&(this._maxY=0)},e.prototype._measure=function(){null!=this._minX&&null!=this._maxX&&null!=this._minY&&null!=this._maxY&&(this._currentMeasure.width=Math.abs(this._maxX-this._minX)+this._lineWidth,this._currentMeasure.height=Math.abs(this._maxY-this._minY)+this._lineWidth)},e.prototype._computeAlignment=function(t,e){null!=this._minX&&null!=this._minY&&(this._currentMeasure.left=this._minX-this._lineWidth/2,this._currentMeasure.top=this._minY-this._lineWidth/2)},e.prototype.dispose=function(){this.reset(),t.prototype.dispose.call(this)},e}(o.Control);e.MultiLine=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(10),n=i(6),s=i(1),a=i(5),h=i(18),l=i(21),u=i(22),c=i(4),_=function(){function t(t){this.name=t,this._groupPanel=new n.StackPanel,this._selectors=new Array,this._groupPanel.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,this._groupPanel.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,this._groupHeader=this._addGroupHeader(t)}return Object.defineProperty(t.prototype,"groupPanel",{get:function(){return this._groupPanel},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"selectors",{get:function(){return this._selectors},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"header",{get:function(){return this._groupHeader.text},set:function(t){"label"!==this._groupHeader.text&&(this._groupHeader.text=t)},enumerable:!0,configurable:!0}),t.prototype._addGroupHeader=function(t){var e=new a.TextBlock("groupHead",t);return e.width=.9,e.height="30px",e.textWrapping=!0,e.color="black",e.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.textHorizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.left="2px",this._groupPanel.addControl(e),e},t.prototype._getSelector=function(t){if(!(t<0||t>=this._selectors.length))return this._selectors[t]},t.prototype.removeSelector=function(t){t<0||t>=this._selectors.length||(this._groupPanel.removeControl(this._selectors[t]),this._selectors.splice(t,1))},t}();e.SelectorGroup=_;var f=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.addCheckbox=function(t,e,i){void 0===e&&(e=function(t){}),void 0===i&&(i=!1);i=i||!1;var r=new h.Checkbox;r.width="20px",r.height="20px",r.color="#364249",r.background="#CCCCCC",r.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,r.onIsCheckedChangedObservable.add(function(t){e(t)});var o=s.Control.AddHeader(r,t,"200px",{isHorizontal:!0,controlFirst:!0});o.height="30px",o.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,o.left="4px",this.groupPanel.addControl(o),this.selectors.push(o),r.isChecked=i,this.groupPanel.parent&&this.groupPanel.parent.parent&&(r.color=this.groupPanel.parent.parent.buttonColor,r.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[1].text=e},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[0].background=e},e}(_);e.CheckboxGroup=f;var p=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._selectNb=0,e}return r(e,t),e.prototype.addRadio=function(t,e,i){void 0===e&&(e=function(t){}),void 0===i&&(i=!1);var r=this._selectNb++,o=new l.RadioButton;o.name=t,o.width="20px",o.height="20px",o.color="#364249",o.background="#CCCCCC",o.group=this.name,o.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,o.onIsCheckedChangedObservable.add(function(t){t&&e(r)});var n=s.Control.AddHeader(o,t,"200px",{isHorizontal:!0,controlFirst:!0});n.height="30px",n.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,n.left="4px",this.groupPanel.addControl(n),this.selectors.push(n),o.isChecked=i,this.groupPanel.parent&&this.groupPanel.parent.parent&&(o.color=this.groupPanel.parent.parent.buttonColor,o.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[1].text=e},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[0].background=e},e}(_);e.RadioGroup=p;var d=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.addSlider=function(t,e,i,r,o,n,a){void 0===e&&(e=function(t){}),void 0===i&&(i="Units"),void 0===r&&(r=0),void 0===o&&(o=0),void 0===n&&(n=0),void 0===a&&(a=function(t){return 0|t});var h=new u.Slider;h.name=i,h.value=n,h.minimum=r,h.maximum=o,h.width=.9,h.height="20px",h.color="#364249",h.background="#CCCCCC",h.borderColor="black",h.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,h.left="4px",h.paddingBottom="4px",h.onValueChangedObservable.add(function(t){h.parent.children[0].text=h.parent.children[0].name+": "+a(t)+" "+h.name,e(t)});var l=s.Control.AddHeader(h,t+": "+a(n)+" "+i,"30px",{isHorizontal:!1,controlFirst:!1});l.height="60px",l.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,l.left="4px",l.children[0].name=t,this.groupPanel.addControl(l),this.selectors.push(l),this.groupPanel.parent&&this.groupPanel.parent.parent&&(h.color=this.groupPanel.parent.parent.buttonColor,h.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[0].name=e,this.selectors[t].children[0].text=e+": "+this.selectors[t].children[1].value+" "+this.selectors[t].children[1].name},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[1].background=e},e}(_);e.SliderGroup=d;var y=function(t){function e(e,i){void 0===i&&(i=[]);var r=t.call(this,e)||this;if(r.name=e,r.groups=i,r._buttonColor="#364249",r._buttonBackground="#CCCCCC",r._headerColor="black",r._barColor="white",r._barHeight="2px",r._spacerHeight="20px",r._bars=new Array,r._groups=i,r.thickness=2,r._panel=new n.StackPanel,r._panel.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,r._panel.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,r._panel.top=5,r._panel.left=5,r._panel.width=.95,i.length>0){for(var o=0;o<i.length-1;o++)r._panel.addControl(i[o].groupPanel),r._addSpacer();r._panel.addControl(i[i.length-1].groupPanel)}return r.addControl(r._panel),r}return r(e,t),e.prototype._getTypeName=function(){return"SelectionPanel"},Object.defineProperty(e.prototype,"headerColor",{get:function(){return this._headerColor},set:function(t){this._headerColor!==t&&(this._headerColor=t,this._setHeaderColor())},enumerable:!0,configurable:!0}),e.prototype._setHeaderColor=function(){for(var t=0;t<this._groups.length;t++)this._groups[t].groupPanel.children[0].color=this._headerColor},Object.defineProperty(e.prototype,"buttonColor",{get:function(){return this._buttonColor},set:function(t){this._buttonColor!==t&&(this._buttonColor=t,this._setbuttonColor())},enumerable:!0,configurable:!0}),e.prototype._setbuttonColor=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorButtonColor(e,this._buttonColor)},Object.defineProperty(e.prototype,"labelColor",{get:function(){return this._labelColor},set:function(t){this._labelColor!==t&&(this._labelColor=t,this._setLabelColor())},enumerable:!0,configurable:!0}),e.prototype._setLabelColor=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorLabelColor(e,this._labelColor)},Object.defineProperty(e.prototype,"buttonBackground",{get:function(){return this._buttonBackground},set:function(t){this._buttonBackground!==t&&(this._buttonBackground=t,this._setButtonBackground())},enumerable:!0,configurable:!0}),e.prototype._setButtonBackground=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorButtonBackground(e,this._buttonBackground)},Object.defineProperty(e.prototype,"barColor",{get:function(){return this._barColor},set:function(t){this._barColor!==t&&(this._barColor=t,this._setBarColor())},enumerable:!0,configurable:!0}),e.prototype._setBarColor=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].children[0].background=this._barColor},Object.defineProperty(e.prototype,"barHeight",{get:function(){return this._barHeight},set:function(t){this._barHeight!==t&&(this._barHeight=t,this._setBarHeight())},enumerable:!0,configurable:!0}),e.prototype._setBarHeight=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].children[0].height=this._barHeight},Object.defineProperty(e.prototype,"spacerHeight",{get:function(){return this._spacerHeight},set:function(t){this._spacerHeight!==t&&(this._spacerHeight=t,this._setSpacerHeight())},enumerable:!0,configurable:!0}),e.prototype._setSpacerHeight=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].height=this._spacerHeight},e.prototype._addSpacer=function(){var t=new c.Container;t.width=1,t.height=this._spacerHeight,t.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT;var e=new o.Rectangle;e.width=1,e.height=this._barHeight,e.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_CENTER,e.background=this._barColor,e.color="transparent",t.addControl(e),this._panel.addControl(t),this._bars.push(t)},e.prototype.addGroup=function(t){this._groups.length>0&&this._addSpacer(),this._panel.addControl(t.groupPanel),this._groups.push(t),t.groupPanel.children[0].color=this._headerColor;for(var e=0;e<t.selectors.length;e++)t._setSelectorButtonColor(e,this._buttonColor),t._setSelectorButtonBackground(e,this._buttonBackground)},e.prototype.removeGroup=function(t){if(!(t<0||t>=this._groups.length)){var e=this._groups[t];this._panel.removeControl(e.groupPanel),this._groups.splice(t,1),t<this._bars.length&&(this._panel.removeControl(this._bars[t]),this._bars.splice(t,1))}},e.prototype.setHeaderName=function(t,e){e<0||e>=this._groups.length||(this._groups[e].groupPanel.children[0].text=t)},e.prototype.relabel=function(t,e,i){if(!(e<0||e>=this._groups.length)){var r=this._groups[e];i<0||i>=r.selectors.length||r._setSelectorLabel(i,t)}},e.prototype.removeFromGroupSelector=function(t,e){if(!(t<0||t>=this._groups.length)){var i=this._groups[t];e<0||e>=i.selectors.length||i.removeSelector(e)}},e.prototype.addToGroupCheckbox=function(t,e,i,r){(void 0===i&&(i=function(){}),void 0===r&&(r=!1),t<0||t>=this._groups.length)||this._groups[t].addCheckbox(e,i,r)},e.prototype.addToGroupRadio=function(t,e,i,r){(void 0===i&&(i=function(){}),void 0===r&&(r=!1),t<0||t>=this._groups.length)||this._groups[t].addRadio(e,i,r)},e.prototype.addToGroupSlider=function(t,e,i,r,o,n,s,a){(void 0===i&&(i=function(){}),void 0===r&&(r="Units"),void 0===o&&(o=0),void 0===n&&(n=0),void 0===s&&(s=0),void 0===a&&(a=function(t){return 0|t}),t<0||t>=this._groups.length)||this._groups[t].addSlider(e,i,r,o,n,s,a)},e}(o.Rectangle);e.SelectionPanel=y},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(6),n=i(0),s=i(16),a=function(){return function(){}}();e.KeyPropertySet=a;var h=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e.onKeyPressObservable=new n.Observable,e.defaultButtonWidth="40px",e.defaultButtonHeight="40px",e.defaultButtonPaddingLeft="2px",e.defaultButtonPaddingRight="2px",e.defaultButtonPaddingTop="2px",e.defaultButtonPaddingBottom="2px",e.defaultButtonColor="#DDD",e.defaultButtonBackground="#070707",e.shiftButtonColor="#7799FF",e.selectedShiftThickness=1,e.shiftState=0,e._currentlyConnectedInputText=null,e._connectedInputTexts=[],e._onKeyPressObserver=null,e}return r(e,t),e.prototype._getTypeName=function(){return"VirtualKeyboard"},e.prototype._createKey=function(t,e){var i=this,r=s.Button.CreateSimpleButton(t,t);return r.width=e&&e.width?e.width:this.defaultButtonWidth,r.height=e&&e.height?e.height:this.defaultButtonHeight,r.color=e&&e.color?e.color:this.defaultButtonColor,r.background=e&&e.background?e.background:this.defaultButtonBackground,r.paddingLeft=e&&e.paddingLeft?e.paddingLeft:this.defaultButtonPaddingLeft,r.paddingRight=e&&e.paddingRight?e.paddingRight:this.defaultButtonPaddingRight,r.paddingTop=e&&e.paddingTop?e.paddingTop:this.defaultButtonPaddingTop,r.paddingBottom=e&&e.paddingBottom?e.paddingBottom:this.defaultButtonPaddingBottom,r.thickness=0,r.isFocusInvisible=!0,r.shadowColor=this.shadowColor,r.shadowBlur=this.shadowBlur,r.shadowOffsetX=this.shadowOffsetX,r.shadowOffsetY=this.shadowOffsetY,r.onPointerUpObservable.add(function(){i.onKeyPressObservable.notifyObservers(t)}),r},e.prototype.addKeysRow=function(t,e){var i=new o.StackPanel;i.isVertical=!1,i.isFocusInvisible=!0;for(var r=0;r<t.length;r++){var n=null;e&&e.length===t.length&&(n=e[r]),i.addControl(this._createKey(t[r],n))}this.addControl(i)},e.prototype.applyShiftState=function(t){if(this.children)for(var e=0;e<this.children.length;e++){var i=this.children[e];if(i&&i.children)for(var r=i,o=0;o<r.children.length;o++){var n=r.children[o];if(n&&n.children[0]){var s=n.children[0];"⇧"===s.text&&(n.color=t?this.shiftButtonColor:this.defaultButtonColor,n.thickness=t>1?this.selectedShiftThickness:0),s.text=t>0?s.text.toUpperCase():s.text.toLowerCase()}}}},Object.defineProperty(e.prototype,"connectedInputText",{get:function(){return this._currentlyConnectedInputText},enumerable:!0,configurable:!0}),e.prototype.connect=function(t){var e=this;if(!this._connectedInputTexts.some(function(e){return e.input===t})){null===this._onKeyPressObserver&&(this._onKeyPressObserver=this.onKeyPressObservable.add(function(t){if(e._currentlyConnectedInputText){switch(e._currentlyConnectedInputText._host.focusedControl=e._currentlyConnectedInputText,t){case"⇧":return e.shiftState++,e.shiftState>2&&(e.shiftState=0),void e.applyShiftState(e.shiftState);case"←":return void e._currentlyConnectedInputText.processKey(8);case"↵":return void e._currentlyConnectedInputText.processKey(13)}e._currentlyConnectedInputText.processKey(-1,e.shiftState?t.toUpperCase():t),1===e.shiftState&&(e.shiftState=0,e.applyShiftState(e.shiftState))}})),this.isVisible=!1,this._currentlyConnectedInputText=t,t._connectedVirtualKeyboard=this;var i=t.onFocusObservable.add(function(){e._currentlyConnectedInputText=t,t._connectedVirtualKeyboard=e,e.isVisible=!0}),r=t.onBlurObservable.add(function(){t._connectedVirtualKeyboard=null,e._currentlyConnectedInputText=null,e.isVisible=!1});this._connectedInputTexts.push({input:t,onBlurObserver:r,onFocusObserver:i})}},e.prototype.disconnect=function(t){var e=this;if(t){var i=this._connectedInputTexts.filter(function(e){return e.input===t});1===i.length&&(this._removeConnectedInputObservables(i[0]),this._connectedInputTexts=this._connectedInputTexts.filter(function(e){return e.input!==t}),this._currentlyConnectedInputText===t&&(this._currentlyConnectedInputText=null))}else this._connectedInputTexts.forEach(function(t){e._removeConnectedInputObservables(t)}),this._connectedInputTexts=[];0===this._connectedInputTexts.length&&(this._currentlyConnectedInputText=null,this.onKeyPressObservable.remove(this._onKeyPressObserver),this._onKeyPressObserver=null)},e.prototype._removeConnectedInputObservables=function(t){t.input._connectedVirtualKeyboard=null,t.input.onFocusObservable.remove(t.onFocusObserver),t.input.onBlurObservable.remove(t.onBlurObserver)},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.disconnect()},e.CreateDefaultLayout=function(t){var i=new e(t);return i.addKeysRow(["1","2","3","4","5","6","7","8","9","0","←"]),i.addKeysRow(["q","w","e","r","t","y","u","i","o","p"]),i.addKeysRow(["a","s","d","f","g","h","j","k","l",";","'","↵"]),i.addKeysRow(["⇧","z","x","c","v","b","n","m",",",".","/"]),i.addKeysRow([" "],[{width:"200px"}]),i},e}(o.StackPanel);e.VirtualKeyboard=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._cellWidth=20,i._cellHeight=20,i._minorLineTickness=1,i._minorLineColor="DarkGray",i._majorLineTickness=2,i._majorLineColor="White",i._majorLineFrequency=5,i._background="Black",i._displayMajorLines=!0,i._displayMinorLines=!0,i}return r(e,t),Object.defineProperty(e.prototype,"displayMinorLines",{get:function(){return this._displayMinorLines},set:function(t){this._displayMinorLines!==t&&(this._displayMinorLines=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"displayMajorLines",{get:function(){return this._displayMajorLines},set:function(t){this._displayMajorLines!==t&&(this._displayMajorLines=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellWidth",{get:function(){return this._cellWidth},set:function(t){this._cellWidth=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellHeight",{get:function(){return this._cellHeight},set:function(t){this._cellHeight=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minorLineTickness",{get:function(){return this._minorLineTickness},set:function(t){this._minorLineTickness=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minorLineColor",{get:function(){return this._minorLineColor},set:function(t){this._minorLineColor=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineTickness",{get:function(){return this._majorLineTickness},set:function(t){this._majorLineTickness=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineColor",{get:function(){return this._majorLineColor},set:function(t){this._majorLineColor=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineFrequency",{get:function(){return this._majorLineFrequency},set:function(t){this._majorLineFrequency=t,this._markAsDirty()},enumerable:!0,configurable:!0}),e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._isEnabled&&this._processMeasures(t,e)){this._background&&(e.fillStyle=this._background,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height));var i=this._currentMeasure.width/this._cellWidth,r=this._currentMeasure.height/this._cellHeight,o=this._currentMeasure.left+this._currentMeasure.width/2,n=this._currentMeasure.top+this._currentMeasure.height/2;if(this._displayMinorLines){e.strokeStyle=this._minorLineColor,e.lineWidth=this._minorLineTickness;for(var s=-i/2;s<i/2;s++){var a=o+s*this.cellWidth;e.beginPath(),e.moveTo(a,this._currentMeasure.top),e.lineTo(a,this._currentMeasure.top+this._currentMeasure.height),e.stroke()}for(var h=-r/2;h<r/2;h++){var l=n+h*this.cellHeight;e.beginPath(),e.moveTo(this._currentMeasure.left,l),e.lineTo(this._currentMeasure.left+this._currentMeasure.width,l),e.stroke()}}if(this._displayMajorLines){e.strokeStyle=this._majorLineColor,e.lineWidth=this._majorLineTickness;for(s=-i/2+this._majorLineFrequency;s<i/2;s+=this._majorLineFrequency){a=o+s*this.cellWidth;e.beginPath(),e.moveTo(a,this._currentMeasure.top),e.lineTo(a,this._currentMeasure.top+this._currentMeasure.height),e.stroke()}for(h=-r/2+this._majorLineFrequency;h<r/2;h+=this._majorLineFrequency){l=n+h*this.cellHeight;e.moveTo(this._currentMeasure.left,l),e.lineTo(this._currentMeasure.left+this._currentMeasure.width,l),e.closePath(),e.stroke()}}}e.restore()},e.prototype._getTypeName=function(){return"DisplayGrid"},e}(i(9).Control);e.DisplayGrid=o},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(1),o=i(6),n=i(5);e.name="Statics",r.Control.AddHeader=function(t,e,i,s){var a=new o.StackPanel("panel"),h=!s||s.isHorizontal,l=!s||s.controlFirst;a.isVertical=!h;var u=new n.TextBlock("header");return u.text=e,u.textHorizontalAlignment=r.Control.HORIZONTAL_ALIGNMENT_LEFT,h?u.width=i:u.height=i,l?(a.addControl(t),a.addControl(u),u.paddingLeft="5px"):(a.addControl(u),a.addControl(t),u.paddingRight="5px"),u.shadowBlur=t.shadowBlur,u.shadowColor=t.shadowColor,u.shadowOffsetX=t.shadowOffsetX,u.shadowOffsetY=t.shadowOffsetY,a}},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(41)),r(i(52)),r(i(53)),r(i(25))},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(24)),r(i(14)),r(i(3)),r(i(13)),r(i(42)),r(i(43)),r(i(47)),r(i(48)),r(i(49)),r(i(50)),r(i(51)),r(i(8))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._radius=5,e}return r(e,t),Object.defineProperty(e.prototype,"radius",{get:function(){return this._radius},set:function(t){var e=this;this._radius!==t&&(this._radius=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){var r=this._cylindricalMapping(e);switch(t.position=r,this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:i.lookAt(new BABYLON.Vector3(-r.x,r.y,-r.z));break;case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new BABYLON.Vector3(2*r.x,r.y,2*r.z));break;case s.Container3D.FACEFORWARD_ORIENTATION:break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:i.rotate(BABYLON.Axis.Y,Math.PI,BABYLON.Space.LOCAL)}}},e.prototype._cylindricalMapping=function(t){var e=new n.Vector3(0,t.y,this._radius),i=t.x/this._radius;return n.Matrix.RotationYawPitchRollToRef(i,0,0,n.Tmp.Matrix[0]),n.Vector3.TransformNormal(e,n.Tmp.Matrix[0])},e}(o.VolumeBasedPanel);e.CylinderPanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(14),n=i(0),s=i(26),a=i(6),h=i(11),l=i(5),u=i(12),c=function(t){function e(e,i){void 0===i&&(i=!0);var r=t.call(this,e)||this;return r._shareMaterials=!0,r._shareMaterials=i,r.pointerEnterAnimation=function(){r.mesh&&r._frontPlate.setEnabled(!0)},r.pointerOutAnimation=function(){r.mesh&&r._frontPlate.setEnabled(!1)},r}return r(e,t),e.prototype._disposeTooltip=function(){this._tooltipFade=null,this._tooltipTextBlock&&this._tooltipTextBlock.dispose(),this._tooltipTexture&&this._tooltipTexture.dispose(),this._tooltipMesh&&this._tooltipMesh.dispose(),this.onPointerEnterObservable.remove(this._tooltipHoverObserver),this.onPointerOutObservable.remove(this._tooltipOutObserver)},Object.defineProperty(e.prototype,"tooltipText",{get:function(){return this._tooltipTextBlock?this._tooltipTextBlock.text:null},set:function(t){var e=this;if(t){if(!this._tooltipFade){this._tooltipMesh=BABYLON.MeshBuilder.CreatePlane("",{size:1},this._backPlate._scene);var i=BABYLON.MeshBuilder.CreatePlane("",{size:1,sideOrientation:BABYLON.Mesh.DOUBLESIDE},this._backPlate._scene),r=new n.StandardMaterial("",this._backPlate._scene);r.diffuseColor=BABYLON.Color3.FromHexString("#212121"),i.material=r,i.isPickable=!1,this._tooltipMesh.addChild(i),i.position.z=.05,this._tooltipMesh.scaling.y=1/3,this._tooltipMesh.position.y=.7,this._tooltipMesh.position.z=-.15,this._tooltipMesh.isPickable=!1,this._tooltipMesh.parent=this._backPlate,this._tooltipTexture=u.AdvancedDynamicTexture.CreateForMesh(this._tooltipMesh),this._tooltipTextBlock=new l.TextBlock,this._tooltipTextBlock.scaleY=3,this._tooltipTextBlock.color="white",this._tooltipTextBlock.fontSize=130,this._tooltipTexture.addControl(this._tooltipTextBlock),this._tooltipFade=new BABYLON.FadeInOutBehavior,this._tooltipFade.delay=500,this._tooltipMesh.addBehavior(this._tooltipFade),this._tooltipHoverObserver=this.onPointerEnterObservable.add(function(){e._tooltipFade&&e._tooltipFade.fadeIn(!0)}),this._tooltipOutObserver=this.onPointerOutObservable.add(function(){e._tooltipFade&&e._tooltipFade.fadeIn(!1)})}this._tooltipTextBlock&&(this._tooltipTextBlock.text=t)}else this._disposeTooltip()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._rebuildContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"imageUrl",{get:function(){return this._imageUrl},set:function(t){this._imageUrl!==t&&(this._imageUrl=t,this._rebuildContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"backMaterial",{get:function(){return this._backMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"frontMaterial",{get:function(){return this._frontMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"plateMaterial",{get:function(){return this._plateMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"shareMaterials",{get:function(){return this._shareMaterials},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"HolographicButton"},e.prototype._rebuildContent=function(){this._disposeFacadeTexture();var t=new a.StackPanel;if(t.isVertical=!0,this._imageUrl){var e=new h.Image;e.source=this._imageUrl,e.paddingTop="40px",e.height="180px",e.width="100px",e.paddingBottom="40px",t.addControl(e)}if(this._text){var i=new l.TextBlock;i.text=this._text,i.color="white",i.height="30px",i.fontSize=24,t.addControl(i)}this._frontPlate&&(this.content=t)},e.prototype._createNode=function(e){return this._backPlate=n.MeshBuilder.CreateBox(this.name+"BackMesh",{width:1,height:1,depth:.08},e),this._frontPlate=n.MeshBuilder.CreateBox(this.name+"FrontMesh",{width:1,height:1,depth:.08},e),this._frontPlate.parent=this._backPlate,this._frontPlate.position.z=-.08,this._frontPlate.isPickable=!1,this._frontPlate.setEnabled(!1),this._textPlate=t.prototype._createNode.call(this,e),this._textPlate.parent=this._backPlate,this._textPlate.position.z=-.08,this._textPlate.isPickable=!1,this._backPlate},e.prototype._applyFacade=function(t){this._plateMaterial.emissiveTexture=t,this._plateMaterial.opacityTexture=t},e.prototype._createBackMaterial=function(t){var e=this;this._backMaterial=new s.FluentMaterial(this.name+"Back Material",t.getScene()),this._backMaterial.renderHoverLight=!0,this._pickedPointObserver=this._host.onPickedPointChangedObservable.add(function(t){t?(e._backMaterial.hoverPosition=t,e._backMaterial.hoverColor.a=1):e._backMaterial.hoverColor.a=0})},e.prototype._createFrontMaterial=function(t){this._frontMaterial=new s.FluentMaterial(this.name+"Front Material",t.getScene()),this._frontMaterial.innerGlowColorIntensity=0,this._frontMaterial.alpha=.5,this._frontMaterial.renderBorders=!0},e.prototype._createPlateMaterial=function(t){this._plateMaterial=new n.StandardMaterial(this.name+"Plate Material",t.getScene()),this._plateMaterial.specularColor=n.Color3.Black()},e.prototype._affectMaterial=function(t){this._shareMaterials?(this._host._sharedMaterials.backFluentMaterial?this._backMaterial=this._host._sharedMaterials.backFluentMaterial:(this._createBackMaterial(t),this._host._sharedMaterials.backFluentMaterial=this._backMaterial),this._host._sharedMaterials.frontFluentMaterial?this._frontMaterial=this._host._sharedMaterials.frontFluentMaterial:(this._createFrontMaterial(t),this._host._sharedMaterials.frontFluentMaterial=this._frontMaterial)):(this._createBackMaterial(t),this._createFrontMaterial(t)),this._createPlateMaterial(t),this._backPlate.material=this._backMaterial,this._frontPlate.material=this._frontMaterial,this._textPlate.material=this._plateMaterial,this._rebuildContent()},e.prototype.dispose=function(){t.prototype.dispose.call(this),this._disposeTooltip(),this.shareMaterials||(this._backMaterial.dispose(),this._frontMaterial.dispose(),this._plateMaterial.dispose(),this._pickedPointObserver&&(this._host.onPickedPointChangedObservable.remove(this._pickedPointObserver),this._pickedPointObserver=null))},e}(o.Button3D);e.HolographicButton=c},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(45);e.fShader=o;var n=i(46);e.vShader=n,e.registerShader=function(){r.Effect.ShadersStore.fluentVertexShader=n,r.Effect.ShadersStore.fluentPixelShader=o}},function(t,e){t.exports="precision highp float;\nvarying vec2 vUV;\nuniform vec4 albedoColor;\n#ifdef INNERGLOW\nuniform vec4 innerGlowColor;\n#endif\n#ifdef BORDER\nvarying vec2 scaleInfo;\nuniform float edgeSmoothingValue;\nuniform float borderMinValue;\n#endif\n#ifdef HOVERLIGHT\nvarying vec3 worldPosition;\nuniform vec3 hoverPosition;\nuniform vec4 hoverColor;\nuniform float hoverRadius;\n#endif\n#ifdef TEXTURE\nuniform sampler2D albedoSampler;\n#endif\nvoid main(void) {\nvec3 albedo=albedoColor.rgb;\nfloat alpha=albedoColor.a;\n#ifdef TEXTURE\nalbedo=texture2D(albedoSampler,vUV).rgb;\n#endif\n#ifdef HOVERLIGHT\nfloat pointToHover=(1.0-clamp(length(hoverPosition-worldPosition)/hoverRadius,0.,1.))*hoverColor.a;\nalbedo=clamp(albedo+hoverColor.rgb*pointToHover,0.,1.);\n#else\nfloat pointToHover=1.0;\n#endif\n#ifdef BORDER \nfloat borderPower=10.0;\nfloat inverseBorderPower=1.0/borderPower;\nvec3 borderColor=albedo*borderPower;\nvec2 distanceToEdge;\ndistanceToEdge.x=abs(vUV.x-0.5)*2.0;\ndistanceToEdge.y=abs(vUV.y-0.5)*2.0;\nfloat borderValue=max(smoothstep(scaleInfo.x-edgeSmoothingValue,scaleInfo.x+edgeSmoothingValue,distanceToEdge.x),\nsmoothstep(scaleInfo.y-edgeSmoothingValue,scaleInfo.y+edgeSmoothingValue,distanceToEdge.y));\nborderColor=borderColor*borderValue*max(borderMinValue*inverseBorderPower,pointToHover); \nalbedo+=borderColor;\nalpha=max(alpha,borderValue);\n#endif\n#ifdef INNERGLOW\n\nvec2 uvGlow=(vUV-vec2(0.5,0.5))*(innerGlowColor.a*2.0);\nuvGlow=uvGlow*uvGlow;\nuvGlow=uvGlow*uvGlow;\nalbedo+=mix(vec3(0.0,0.0,0.0),innerGlowColor.rgb,uvGlow.x+uvGlow.y); \n#endif\ngl_FragColor=vec4(albedo,alpha);\n}"},function(t,e){t.exports="precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\nattribute vec2 uv;\n\nuniform mat4 world;\nuniform mat4 viewProjection;\nvarying vec2 vUV;\n#ifdef BORDER\nvarying vec2 scaleInfo;\nuniform float borderWidth;\nuniform vec3 scaleFactor;\n#endif\n#ifdef HOVERLIGHT\nvarying vec3 worldPosition;\n#endif\nvoid main(void) {\nvUV=uv;\n#ifdef BORDER\nvec3 scale=scaleFactor;\nfloat minScale=min(min(scale.x,scale.y),scale.z);\nfloat maxScale=max(max(scale.x,scale.y),scale.z);\nfloat minOverMiddleScale=minScale/(scale.x+scale.y+scale.z-minScale-maxScale);\nfloat areaYZ=scale.y*scale.z;\nfloat areaXZ=scale.x*scale.z;\nfloat areaXY=scale.x*scale.y;\nfloat scaledBorderWidth=borderWidth; \nif (abs(normal.x) == 1.0) \n{\nscale.x=scale.y;\nscale.y=scale.z;\nif (areaYZ>areaXZ && areaYZ>areaXY)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nelse if (abs(normal.y) == 1.0) \n{\nscale.x=scale.z;\nif (areaXZ>areaXY && areaXZ>areaYZ)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nelse \n{\nif (areaXY>areaYZ && areaXY>areaXZ)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nfloat scaleRatio=min(scale.x,scale.y)/max(scale.x,scale.y);\nif (scale.x>scale.y)\n{\nscaleInfo.x=1.0-(scaledBorderWidth*scaleRatio);\nscaleInfo.y=1.0-scaledBorderWidth;\n}\nelse\n{\nscaleInfo.x=1.0-scaledBorderWidth;\nscaleInfo.y=1.0-(scaledBorderWidth*scaleRatio);\n} \n#endif \nvec4 worldPos=world*vec4(position,1.0);\n#ifdef HOVERLIGHT\nworldPosition=worldPos.xyz;\n#endif\ngl_Position=viewProjection*worldPos;\n}\n"},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e,i){var r=t.call(this,i)||this;return r._currentMesh=e,r.pointerEnterAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1.1)},r.pointerOutAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1/1.1)},r.pointerDownAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(.95)},r.pointerUpAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1/.95)},r}return r(e,t),e.prototype._getTypeName=function(){return"MeshButton3D"},e.prototype._createNode=function(t){var e=this;return this._currentMesh.getChildMeshes().forEach(function(t){t.metadata=e}),this._currentMesh},e.prototype._affectMaterial=function(t){},e}(i(14).Button3D);e.MeshButton3D=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=i(3),s=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){t.position=e.clone();var r=o.Tmp.Vector3[0];switch(r.copyFrom(e),this.orientation){case n.Container3D.FACEORIGIN_ORIENTATION:case n.Container3D.FACEFORWARD_ORIENTATION:r.addInPlace(new BABYLON.Vector3(0,0,-1)),i.lookAt(r);break;case n.Container3D.FACEFORWARDREVERSED_ORIENTATION:case n.Container3D.FACEORIGINREVERSED_ORIENTATION:r.addInPlace(new BABYLON.Vector3(0,0,1)),i.lookAt(r)}}},e}(i(8).VolumeBasedPanel);e.PlanePanel=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._iteration=100,e}return r(e,t),Object.defineProperty(e.prototype,"iteration",{get:function(){return this._iteration},set:function(t){var e=this;this._iteration!==t&&(this._iteration=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh,r=this._scatterMapping(e);if(i){switch(this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:case s.Container3D.FACEFORWARD_ORIENTATION:i.lookAt(new n.Vector3(0,0,-1));break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new n.Vector3(0,0,1))}t.position=r}},e.prototype._scatterMapping=function(t){return t.x=(1-2*Math.random())*this._cellWidth,t.y=(1-2*Math.random())*this._cellHeight,t},e.prototype._finalProcessing=function(){for(var t=[],e=0,i=this._children;e<i.length;e++){var r=i[e];r.mesh&&t.push(r.mesh)}for(var o=0;o<this._iteration;o++){t.sort(function(t,e){var i=t.position.lengthSquared(),r=e.position.lengthSquared();return i<r?1:i>r?-1:0});for(var s=Math.pow(this.margin,2),a=Math.max(this._cellWidth,this._cellHeight),h=n.Tmp.Vector2[0],l=n.Tmp.Vector3[0],u=0;u<t.length-1;u++)for(var c=u+1;c<t.length;c++)if(u!=c){t[c].position.subtractToRef(t[u].position,l),h.x=l.x,h.y=l.y;var _=a,f=h.lengthSquared()-s;(f-=Math.min(f,s))<Math.pow(_,2)&&(h.normalize(),l.scaleInPlace(.5*(_-Math.sqrt(f))),t[c].position.addInPlace(l),t[u].position.subtractInPlace(l))}}},e}(o.VolumeBasedPanel);e.ScatterPanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._radius=5,e}return r(e,t),Object.defineProperty(e.prototype,"radius",{get:function(){return this._radius},set:function(t){var e=this;this._radius!==t&&(this._radius=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){var r=this._sphericalMapping(e);switch(t.position=r,this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:i.lookAt(new BABYLON.Vector3(-r.x,-r.y,-r.z));break;case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new BABYLON.Vector3(2*r.x,2*r.y,2*r.z));break;case s.Container3D.FACEFORWARD_ORIENTATION:break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:i.rotate(BABYLON.Axis.Y,Math.PI,BABYLON.Space.LOCAL)}}},e.prototype._sphericalMapping=function(t){var e=new n.Vector3(0,0,this._radius),i=t.y/this._radius,r=-t.x/this._radius;return n.Matrix.RotationYawPitchRollToRef(r,i,0,n.Tmp.Matrix[0]),n.Vector3.TransformNormal(e,n.Tmp.Matrix[0])},e}(o.VolumeBasedPanel);e.SpherePanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(3),n=i(0),s=function(t){function e(e){void 0===e&&(e=!1);var i=t.call(this)||this;return i._isVertical=!1,i.margin=.1,i._isVertical=e,i}return r(e,t),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){var e=this;this._isVertical!==t&&(this._isVertical=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._arrangeChildren=function(){for(var t,e=0,i=0,r=0,o=[],s=n.Matrix.Invert(this.node.computeWorldMatrix(!0)),a=0,h=this._children;a<h.length;a++){if((p=h[a]).mesh){r++,p.mesh.computeWorldMatrix(!0),p.mesh.getWorldMatrix().multiplyToRef(s,n.Tmp.Matrix[0]);var l=p.mesh.getBoundingInfo().boundingBox,u=n.Vector3.TransformNormal(l.extendSize,n.Tmp.Matrix[0]);o.push(u),this._isVertical?i+=u.y:e+=u.x}}this._isVertical?i+=(r-1)*this.margin/2:e+=(r-1)*this.margin/2,t=this._isVertical?-i:-e;for(var c=0,_=0,f=this._children;_<f.length;_++){var p;if((p=f[_]).mesh){r--;u=o[c++];this._isVertical?(p.position.y=t+u.y,p.position.x=0,t+=2*u.y):(p.position.x=t+u.x,p.position.y=0,t+=2*u.x),t+=r>0?this.margin:0}}},e}(o.Container3D);e.StackPanel3D=s},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),function(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}(i(26))},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(3),n=function(){function t(t){var e=this;this._lastControlOver={},this._lastControlDown={},this.onPickedPointChangedObservable=new r.Observable,this._sharedMaterials={},this._scene=t||r.Engine.LastCreatedScene,this._sceneDisposeObserver=this._scene.onDisposeObservable.add(function(){e._sceneDisposeObserver=null,e._utilityLayer=null,e.dispose()}),this._utilityLayer=new r.UtilityLayerRenderer(this._scene),this._utilityLayer.onlyCheckPointerDownEvents=!1,this._utilityLayer.mainSceneTrackerPredicate=function(t){return t&&t.metadata&&t.metadata._node},this._rootContainer=new o.Container3D("RootContainer"),this._rootContainer._host=this;var i=this._utilityLayer.utilityLayerScene;this._pointerOutObserver=this._utilityLayer.onPointerOutObservable.add(function(t){e._handlePointerOut(t,!0)}),this._pointerObserver=i.onPointerObservable.add(function(t,i){e._doPicking(t)}),this._utilityLayer.utilityLayerScene.autoClear=!1,this._utilityLayer.utilityLayerScene.autoClearDepthAndStencil=!1,new r.HemisphericLight("hemi",r.Vector3.Up(),this._utilityLayer.utilityLayerScene)}return Object.defineProperty(t.prototype,"scene",{get:function(){return this._scene},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"utilityLayer",{get:function(){return this._utilityLayer},enumerable:!0,configurable:!0}),t.prototype._handlePointerOut=function(t,e){var i=this._lastControlOver[t];i&&(i._onPointerOut(i),delete this._lastControlOver[t]),e&&this._lastControlDown[t]&&(this._lastControlDown[t].forcePointerUp(),delete this._lastControlDown[t]),this.onPickedPointChangedObservable.notifyObservers(null)},t.prototype._doPicking=function(t){if(!this._utilityLayer||!this._utilityLayer.utilityLayerScene.activeCamera)return!1;var e=t.event,i=e.pointerId||0,o=e.button,n=t.pickInfo;if(!n||!n.hit)return this._handlePointerOut(i,t.type===r.PointerEventTypes.POINTERUP),!1;var s=n.pickedMesh.metadata;return n.pickedPoint&&this.onPickedPointChangedObservable.notifyObservers(n.pickedPoint),s._processObservables(t.type,n.pickedPoint,i,o)||t.type===r.PointerEventTypes.POINTERMOVE&&(this._lastControlOver[i]&&this._lastControlOver[i]._onPointerOut(this._lastControlOver[i]),delete this._lastControlOver[i]),t.type===r.PointerEventTypes.POINTERUP&&(this._lastControlDown[e.pointerId]&&(this._lastControlDown[e.pointerId].forcePointerUp(),delete this._lastControlDown[e.pointerId]),"touch"===e.pointerType&&this._handlePointerOut(i,!1)),!0},Object.defineProperty(t.prototype,"rootContainer",{get:function(){return this._rootContainer},enumerable:!0,configurable:!0}),t.prototype.containsControl=function(t){return this._rootContainer.containsControl(t)},t.prototype.addControl=function(t){return this._rootContainer.addControl(t),this},t.prototype.removeControl=function(t){return this._rootContainer.removeControl(t),this},t.prototype.dispose=function(){for(var t in this._rootContainer.dispose(),this._sharedMaterials)this._sharedMaterials.hasOwnProperty(t)&&this._sharedMaterials[t].dispose();this._sharedMaterials={},this._pointerOutObserver&&this._utilityLayer&&(this._utilityLayer.onPointerOutObservable.remove(this._pointerOutObserver),this._pointerOutObserver=null),this.onPickedPointChangedObservable.clear();var e=this._utilityLayer?this._utilityLayer.utilityLayerScene:null;e&&this._pointerObserver&&(e.onPointerObservable.remove(this._pointerObserver),this._pointerObserver=null),this._scene&&this._sceneDisposeObserver&&(this._scene.onDisposeObservable.remove(this._sceneDisposeObserver),this._sceneDisposeObserver=null),this._utilityLayer&&this._utilityLayer.dispose()},t}();e.GUI3DManager=n}])});
//# sourceMappingURL=babylon.gui.min.js.map

!(function(i){var e,t,n,r,o;(t=e=i.GLTFLoaderCoordinateSystemMode||(i.GLTFLoaderCoordinateSystemMode={}))[t.AUTO=0]="AUTO",t[t.FORCE_RIGHT_HANDED=1]="FORCE_RIGHT_HANDED",(r=n=i.GLTFLoaderAnimationStartMode||(i.GLTFLoaderAnimationStartMode={}))[r.NONE=0]="NONE",r[r.FIRST=1]="FIRST",r[r.ALL=2]="ALL",(o=i.GLTFLoaderState||(i.GLTFLoaderState={}))[o.LOADING=0]="LOADING",o[o.READY=1]="READY",o[o.COMPLETE=2]="COMPLETE";var a=(function(){function l(){this.onParsedObservable=new i.Observable,this.coordinateSystemMode=e.AUTO,this.animationStartMode=n.FIRST,this.compileMaterials=!1,this.useClipPlane=!1,this.compileShadowGenerators=!1,this.transparencyAsCoverage=!1,this.preprocessUrlAsync=function(e){return Promise.resolve(e)},this.onMeshLoadedObservable=new i.Observable,this.onTextureLoadedObservable=new i.Observable,this.onMaterialLoadedObservable=new i.Observable,this.onCameraLoadedObservable=new i.Observable,this.onCompleteObservable=new i.Observable,this.onErrorObservable=new i.Observable,this.onDisposeObservable=new i.Observable,this.onExtensionLoadedObservable=new i.Observable,this.validate=!1,this.onValidatedObservable=new i.Observable,this._loader=null,this.name="gltf",this.extensions={".gltf":{isBinary:!1},".glb":{isBinary:!0}},this._logIndentLevel=0,this._loggingEnabled=!1,this._log=this._logDisabled,this._capturePerformanceCounters=!1,this._startPerformanceCounter=this._startPerformanceCounterDisabled,this._endPerformanceCounter=this._endPerformanceCounterDisabled}return Object.defineProperty(l.prototype,"onParsed",{set:function(e){this._onParsedObserver&&this.onParsedObservable.remove(this._onParsedObserver),this._onParsedObserver=this.onParsedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onMeshLoaded",{set:function(e){this._onMeshLoadedObserver&&this.onMeshLoadedObservable.remove(this._onMeshLoadedObserver),this._onMeshLoadedObserver=this.onMeshLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onTextureLoaded",{set:function(e){this._onTextureLoadedObserver&&this.onTextureLoadedObservable.remove(this._onTextureLoadedObserver),this._onTextureLoadedObserver=this.onTextureLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onMaterialLoaded",{set:function(e){this._onMaterialLoadedObserver&&this.onMaterialLoadedObservable.remove(this._onMaterialLoadedObserver),this._onMaterialLoadedObserver=this.onMaterialLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onCameraLoaded",{set:function(e){this._onCameraLoadedObserver&&this.onCameraLoadedObservable.remove(this._onCameraLoadedObserver),this._onCameraLoadedObserver=this.onCameraLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onComplete",{set:function(e){this._onCompleteObserver&&this.onCompleteObservable.remove(this._onCompleteObserver),this._onCompleteObserver=this.onCompleteObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onError",{set:function(e){this._onErrorObserver&&this.onErrorObservable.remove(this._onErrorObserver),this._onErrorObserver=this.onErrorObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onDispose",{set:function(e){this._onDisposeObserver&&this.onDisposeObservable.remove(this._onDisposeObserver),this._onDisposeObserver=this.onDisposeObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onExtensionLoaded",{set:function(e){this._onExtensionLoadedObserver&&this.onExtensionLoadedObservable.remove(this._onExtensionLoadedObserver),this._onExtensionLoadedObserver=this.onExtensionLoadedObservable.add(e)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"loggingEnabled",{get:function(){return this._loggingEnabled},set:function(e){this._loggingEnabled!==e&&(this._loggingEnabled=e,this._loggingEnabled?this._log=this._logEnabled:this._log=this._logDisabled)},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"capturePerformanceCounters",{get:function(){return this._capturePerformanceCounters},set:function(e){this._capturePerformanceCounters!==e&&(this._capturePerformanceCounters=e,this._capturePerformanceCounters?(this._startPerformanceCounter=this._startPerformanceCounterEnabled,this._endPerformanceCounter=this._endPerformanceCounterEnabled):(this._startPerformanceCounter=this._startPerformanceCounterDisabled,this._endPerformanceCounter=this._endPerformanceCounterDisabled))},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"onValidated",{set:function(e){this._onValidatedObserver&&this.onValidatedObservable.remove(this._onValidatedObserver),this._onValidatedObserver=this.onValidatedObservable.add(e)},enumerable:!0,configurable:!0}),l.prototype.dispose=function(){this._loader&&(this._loader.dispose(),this._loader=null),this._clear(),this.onDisposeObservable.notifyObservers(void 0),this.onDisposeObservable.clear()},l.prototype._clear=function(){this.preprocessUrlAsync=function(e){return Promise.resolve(e)},this.onMeshLoadedObservable.clear(),this.onTextureLoadedObservable.clear(),this.onMaterialLoadedObservable.clear(),this.onCameraLoadedObservable.clear(),this.onCompleteObservable.clear(),this.onExtensionLoadedObservable.clear()},l.prototype.importMeshAsync=function(t,n,e,r,o,a){var i=this;return this._parseAsync(n,e,r,a).then((function(e){return i._log("Loading "+(a||"")),i._loader=i._getLoader(e),i._loader.importMeshAsync(t,n,e,r,o,a)}))},l.prototype.loadAsync=function(t,e,n,r,o){var a=this;return this._parseAsync(t,e,n,o).then((function(e){return a._log("Loading "+(o||"")),a._loader=a._getLoader(e),a._loader.loadAsync(t,e,n,r,o)}))},l.prototype.loadAssetContainerAsync=function(n,e,t,r,o){var a=this;return this._parseAsync(n,e,t,o).then((function(e){return a._log("Loading "+(o||"")),a._loader=a._getLoader(e),a._loader.importMeshAsync(null,n,e,t,r,o).then((function(e){var t=new i.AssetContainer(n);return Array.prototype.push.apply(t.meshes,e.meshes),Array.prototype.push.apply(t.particleSystems,e.particleSystems),Array.prototype.push.apply(t.skeletons,e.skeletons),Array.prototype.push.apply(t.animationGroups,e.animationGroups),t.removeAllFromScene(),t}))}))},l.prototype.canDirectLoad=function(e){return-1!==e.indexOf("scene")&&-1!==e.indexOf("node")},l.prototype.createPlugin=function(){return new l},Object.defineProperty(l.prototype,"loaderState",{get:function(){return this._loader?this._loader.state:null},enumerable:!0,configurable:!0}),l.prototype.whenCompleteAsync=function(){var n=this;return new Promise(function(e,t){n.onCompleteObservable.addOnce((function(){e()})),n.onErrorObservable.addOnce((function(e){t(e)}))})},l.prototype._parseAsync=function(e,n,r,o){var a=this;return Promise.resolve().then((function(){var t=n instanceof ArrayBuffer?a._unpackBinary(n):{json:n,bin:null};return a._validateAsync(e,t.json,r,o).then((function(){a._startPerformanceCounter("Parse JSON"),a._log("JSON length: "+t.json.length);var e={json:JSON.parse(t.json),bin:t.bin};return a._endPerformanceCounter("Parse JSON"),a.onParsedObservable.notifyObservers(e),a.onParsedObservable.clear(),e}))}))},l.prototype._validateAsync=function(t,e,n,r){var o=this;if(!this.validate||"undefined"==typeof GLTFValidator)return Promise.resolve();this._startPerformanceCounter("Validate JSON");var a={externalResourceFunction:function(e){return o.preprocessUrlAsync(n+e).then((function(e){return t._loadFileAsync(e,!0,!0)})).then((function(e){return new Uint8Array(e)}))}};return r&&"data:"!==r.substr(0,5)&&(a.uri="file:"===n?r:""+n+r),GLTFValidator.validateString(e,a).then((function(e){o._endPerformanceCounter("Validate JSON"),o.onValidatedObservable.notifyObservers(e),o.onValidatedObservable.clear()}))},l.prototype._getLoader=function(e){var t=e.json.asset||{};this._log("Asset version: "+t.version),t.minVersion&&this._log("Asset minimum version: "+t.minVersion),t.generator&&this._log("Asset generator: "+t.generator);var n=l._parseVersion(t.version);if(!n)throw new Error("Invalid version: "+t.version);if(void 0!==t.minVersion){var r=l._parseVersion(t.minVersion);if(!r)throw new Error("Invalid minimum version: "+t.minVersion);if(0<l._compareVersion(r,{major:2,minor:0}))throw new Error("Incompatible minimum version: "+t.minVersion)}var o={1:l._CreateGLTFLoaderV1,2:l._CreateGLTFLoaderV2}[n.major];if(!o)throw new Error("Unsupported version: "+t.version);return o(this)},l.prototype._unpackBinary=function(e){this._startPerformanceCounter("Unpack binary"),this._log("Binary length: "+e.byteLength);var t=new s(e),n=t.readUint32();if(1179937895!==n)throw new Error("Unexpected magic: "+n);var r,o=t.readUint32();switch(this.loggingEnabled&&this._log("Binary version: "+o),o){case 1:r=this._unpackBinaryV1(t);break;case 2:r=this._unpackBinaryV2(t);break;default:throw new Error("Unsupported version: "+o)}return this._endPerformanceCounter("Unpack binary"),r},l.prototype._unpackBinaryV1=function(e){var t=e.readUint32();if(t!=e.getLength())throw new Error("Length in header does not match actual data length: "+t+" != "+e.getLength());var n,r=e.readUint32(),o=e.readUint32();switch(o){case 0:n=l._decodeBufferToText(e.readUint8Array(r));break;default:throw new Error("Unexpected content format: "+o)}var a=e.getLength()-e.getPosition();return{json:n,bin:e.readUint8Array(a)}},l.prototype._unpackBinaryV2=function(e){var t=1313821514,n=5130562,r=e.readUint32();if(r!==e.getLength())throw new Error("Length in header does not match actual data length: "+r+" != "+e.getLength());var o=e.readUint32();if(e.readUint32()!==t)throw new Error("First chunk format is not JSON");for(var a=l._decodeBufferToText(e.readUint8Array(o)),i=null;e.getPosition()<e.getLength();){var s=e.readUint32();switch(e.readUint32()){case t:throw new Error("Unexpected JSON chunk");case n:i=e.readUint8Array(s);break;default:e.skipBytes(s)}}return{json:a,bin:i}},l._parseVersion=function(e){if("1.0"===e||"1.0.1"===e)return{major:1,minor:0};var t=(e+"").match(/^(\d+)\.(\d+)/);return t?{major:parseInt(t[1]),minor:parseInt(t[2])}:null},l._compareVersion=function(e,t){return e.major>t.major?1:e.major<t.major?-1:e.minor>t.minor?1:e.minor<t.minor?-1:0},l._decodeBufferToText=function(e){for(var t="",n=e.byteLength,r=0;r<n;r++)t+=String.fromCharCode(e[r]);return t},l.prototype._logOpen=function(e){this._log(e),this._logIndentLevel++},l.prototype._logClose=function(){--this._logIndentLevel},l.prototype._logEnabled=function(e){var t=l._logSpaces.substr(0,2*this._logIndentLevel);i.Tools.Log(""+t+e)},l.prototype._logDisabled=function(e){},l.prototype._startPerformanceCounterEnabled=function(e){i.Tools.StartPerformanceCounter(e)},l.prototype._startPerformanceCounterDisabled=function(e){},l.prototype._endPerformanceCounterEnabled=function(e){i.Tools.EndPerformanceCounter(e)},l.prototype._endPerformanceCounterDisabled=function(e){},l.IncrementalLoading=!0,l.HomogeneousCoordinates=!1,l._logSpaces="                                ",l})();i.GLTFFileLoader=a;var s=(function(){function e(e){this._arrayBuffer=e,this._dataView=new DataView(e),this._byteOffset=0}return e.prototype.getPosition=function(){return this._byteOffset},e.prototype.getLength=function(){return this._arrayBuffer.byteLength},e.prototype.readUint32=function(){var e=this._dataView.getUint32(this._byteOffset,!0);return this._byteOffset+=4,e},e.prototype.readUint8Array=function(e){var t=new Uint8Array(this._arrayBuffer,this._byteOffset,e);return this._byteOffset+=e,t},e.prototype.skipBytes=function(e){this._byteOffset+=e},e})();i.SceneLoader&&i.SceneLoader.RegisterPlugin(new a)})(BABYLON||(BABYLON={})),(function(e){var t,n,r,o,a,i,s,l,u;t=e.GLTF1||(e.GLTF1={}),(n=t.EComponentType||(t.EComponentType={}))[n.BYTE=5120]="BYTE",n[n.UNSIGNED_BYTE=5121]="UNSIGNED_BYTE",n[n.SHORT=5122]="SHORT",n[n.UNSIGNED_SHORT=5123]="UNSIGNED_SHORT",n[n.FLOAT=5126]="FLOAT",(r=t.EShaderType||(t.EShaderType={}))[r.FRAGMENT=35632]="FRAGMENT",r[r.VERTEX=35633]="VERTEX",(o=t.EParameterType||(t.EParameterType={}))[o.BYTE=5120]="BYTE",o[o.UNSIGNED_BYTE=5121]="UNSIGNED_BYTE",o[o.SHORT=5122]="SHORT",o[o.UNSIGNED_SHORT=5123]="UNSIGNED_SHORT",o[o.INT=5124]="INT",o[o.UNSIGNED_INT=5125]="UNSIGNED_INT",o[o.FLOAT=5126]="FLOAT",o[o.FLOAT_VEC2=35664]="FLOAT_VEC2",o[o.FLOAT_VEC3=35665]="FLOAT_VEC3",o[o.FLOAT_VEC4=35666]="FLOAT_VEC4",o[o.INT_VEC2=35667]="INT_VEC2",o[o.INT_VEC3=35668]="INT_VEC3",o[o.INT_VEC4=35669]="INT_VEC4",o[o.BOOL=35670]="BOOL",o[o.BOOL_VEC2=35671]="BOOL_VEC2",o[o.BOOL_VEC3=35672]="BOOL_VEC3",o[o.BOOL_VEC4=35673]="BOOL_VEC4",o[o.FLOAT_MAT2=35674]="FLOAT_MAT2",o[o.FLOAT_MAT3=35675]="FLOAT_MAT3",o[o.FLOAT_MAT4=35676]="FLOAT_MAT4",o[o.SAMPLER_2D=35678]="SAMPLER_2D",(a=t.ETextureWrapMode||(t.ETextureWrapMode={}))[a.CLAMP_TO_EDGE=33071]="CLAMP_TO_EDGE",a[a.MIRRORED_REPEAT=33648]="MIRRORED_REPEAT",a[a.REPEAT=10497]="REPEAT",(i=t.ETextureFilterType||(t.ETextureFilterType={}))[i.NEAREST=9728]="NEAREST",i[i.LINEAR=9728]="LINEAR",i[i.NEAREST_MIPMAP_NEAREST=9984]="NEAREST_MIPMAP_NEAREST",i[i.LINEAR_MIPMAP_NEAREST=9985]="LINEAR_MIPMAP_NEAREST",i[i.NEAREST_MIPMAP_LINEAR=9986]="NEAREST_MIPMAP_LINEAR",i[i.LINEAR_MIPMAP_LINEAR=9987]="LINEAR_MIPMAP_LINEAR",(s=t.ETextureFormat||(t.ETextureFormat={}))[s.ALPHA=6406]="ALPHA",s[s.RGB=6407]="RGB",s[s.RGBA=6408]="RGBA",s[s.LUMINANCE=6409]="LUMINANCE",s[s.LUMINANCE_ALPHA=6410]="LUMINANCE_ALPHA",(l=t.ECullingType||(t.ECullingType={}))[l.FRONT=1028]="FRONT",l[l.BACK=1029]="BACK",l[l.FRONT_AND_BACK=1032]="FRONT_AND_BACK",(u=t.EBlendingFunction||(t.EBlendingFunction={}))[u.ZERO=0]="ZERO",u[u.ONE=1]="ONE",u[u.SRC_COLOR=768]="SRC_COLOR",u[u.ONE_MINUS_SRC_COLOR=769]="ONE_MINUS_SRC_COLOR",u[u.DST_COLOR=774]="DST_COLOR",u[u.ONE_MINUS_DST_COLOR=775]="ONE_MINUS_DST_COLOR",u[u.SRC_ALPHA=770]="SRC_ALPHA",u[u.ONE_MINUS_SRC_ALPHA=771]="ONE_MINUS_SRC_ALPHA",u[u.DST_ALPHA=772]="DST_ALPHA",u[u.ONE_MINUS_DST_ALPHA=773]="ONE_MINUS_DST_ALPHA",u[u.CONSTANT_COLOR=32769]="CONSTANT_COLOR",u[u.ONE_MINUS_CONSTANT_COLOR=32770]="ONE_MINUS_CONSTANT_COLOR",u[u.CONSTANT_ALPHA=32771]="CONSTANT_ALPHA",u[u.ONE_MINUS_CONSTANT_ALPHA=32772]="ONE_MINUS_CONSTANT_ALPHA",u[u.SRC_ALPHA_SATURATE=776]="SRC_ALPHA_SATURATE"})(BABYLON||(BABYLON={})),(function(W){!(function(B){var D,e;(e=D||(D={}))[e.IDENTIFIER=1]="IDENTIFIER",e[e.UNKNOWN=2]="UNKNOWN",e[e.END_OF_INPUT=3]="END_OF_INPUT";var G=(function(){function e(e){this._pos=0,this.currentToken=D.UNKNOWN,this.currentIdentifier="",this.currentString="",this.isLetterOrDigitPattern=/^[a-zA-Z0-9]+$/,this._toParse=e,this._maxPos=e.length}return e.prototype.getNextToken=function(){if(this.isEnd())return D.END_OF_INPUT;if(this.currentString=this.read(),this.currentToken=D.UNKNOWN,"_"===this.currentString||this.isLetterOrDigitPattern.test(this.currentString))for(this.currentToken=D.IDENTIFIER,this.currentIdentifier=this.currentString;!this.isEnd()&&(this.isLetterOrDigitPattern.test(this.currentString=this.peek())||"_"===this.currentString);)this.currentIdentifier+=this.currentString,this.forward();return this.currentToken},e.prototype.peek=function(){return this._toParse[this._pos]},e.prototype.read=function(){return this._toParse[this._pos++]},e.prototype.forward=function(){this._pos++},e.prototype.isEnd=function(){return this._pos>=this._maxPos},e})(),V=["MODEL","VIEW","PROJECTION","MODELVIEW","MODELVIEWPROJECTION","JOINTMATRIX"],U=["world","view","projection","worldView","worldViewProjection","mBones"],w=["translation","rotation","scale"],S=["position","rotationQuaternion","scaling"],o=function(e,t,n){for(var r in e){var o=e[r];n[t][r]=o}},N=function(e){if(e)for(var t=0;t<e.length/2;t++)e[2*t+1]=1-e[2*t+1]},k=function(e){if("NORMAL"===e.semantic)return"normal";if("POSITION"===e.semantic)return"position";if("JOINT"===e.semantic)return"matricesIndices";if("WEIGHT"===e.semantic)return"matricesWeights";if("COLOR"===e.semantic)return"color";if(e.semantic&&-1!==e.semantic.indexOf("TEXCOORD_")){var t=Number(e.semantic.split("_")[1]);return"uv"+(0===t?"":t+1)}return null},v=function(e){var t=null;if(e.translation||e.rotation||e.scale){var n=W.Vector3.FromArray(e.scale||[1,1,1]),r=W.Quaternion.FromArray(e.rotation||[0,0,0,1]),o=W.Vector3.FromArray(e.translation||[0,0,0]);t=W.Matrix.Compose(n,r,o)}else t=W.Matrix.FromArray(e.matrix);return t},b=function(e,t,n,r){for(var o=0;o<r.bones.length;o++)if(r.bones[o].name===n)return r.bones[o];var a=e.nodes;for(var i in a){var s=a[i];if(s.jointName){var l=s.children;for(o=0;o<l.length;o++){var u=e.nodes[l[o]];if(u.jointName&&u.jointName===n){var c=v(s),d=new W.Bone(s.name||"",r,b(e,t,s.jointName,r),c);return d.id=i,d}}}}return null},T=function(e,t){for(var n=0;n<e.length;n++)for(var r=e[n],o=0;o<r.node.children.length;o++){if(r.node.children[o]===t)return r.bone}return null},L=function(e,t){var n=e.nodes,r=n[t];if(r)return{node:r,id:t};for(var o in n)if((r=n[o]).jointName===t)return{node:r,id:o};return null},E=function(e,t){for(var n=0;n<e.jointNames.length;n++)if(e.jointNames[n]===t)return!0;return!1},x=function(e,t,n,r,o){if(r||(r=new W.Skeleton(t.name||"","",e.scene)),!t.babylonSkeleton)return r;var a=[],i=[];!(function(e,t,n,r){for(var o in e.nodes){var a=e.nodes[o],i=o;if(a.jointName&&!E(n,a.jointName)){var s=v(a),l=new W.Bone(a.name||"",t,null,s);l.id=i,r.push({bone:l,node:a,id:i})}}for(var u=0;u<r.length;u++)for(var c=r[u],d=c.node.children,f=0;f<d.length;f++){for(var h=null,p=0;p<r.length;p++)if(r[p].id===d[f]){h=r[p];break}h&&(h.bone._parent=c.bone,c.bone.children.push(h.bone))}})(e,r,t,a),r.bones=[];for(var s=0;s<t.jointNames.length;s++){if(g=L(e,t.jointNames[s])){var l=g.node;if(l){o=g.id;var u=e.scene.getBoneByID(o);if(u)r.bones.push(u);else{for(var c=!1,d=null,f=0;f<s;f++){var h=L(e,t.jointNames[f]);if(h){var p=h.node;if(p){var m=p.children;if(m){c=!1;for(var _=0;_<m.length;_++)if(m[_]===o){d=b(e,t,t.jointNames[f],r),c=!0;break}if(c)break}}else W.Tools.Warn("Joint named "+t.jointNames[f]+" does not exist when looking for parent")}}var y=v(l);!d&&0<a.length&&(d=T(a,o))&&-1===i.indexOf(d)&&i.push(d),new W.Bone(l.jointName||"",r,d,y).id=o}}else W.Tools.Warn("Joint named "+t.jointNames[s]+" does not exist")}}var A=r.bones;r.bones=[];for(s=0;s<t.jointNames.length;s++){var g;if(g=L(e,t.jointNames[s]))for(f=0;f<A.length;f++)if(A[f].id===g.id){r.bones.push(A[f]);break}}r.prepare();for(s=0;s<i.length;s++)r.bones.push(i[s]);return r},O=function(e,t,n,r,o){if(o||((o=new W.Mesh(t.name||"",e.scene)).id=r),!t.babylonNode)return o;for(var a,i=[],s=null,l=new Array,u=new Array,c=new Array,d=new Array,f=0;f<n.length;f++){var h=n[f];if(w=e.meshes[h])for(var p=0;p<w.primitives.length;p++){var m=new W.VertexData,_=w.primitives[p];_.mode;var y=_.attributes,A=null,g=null;for(var v in y)if(A=e.accessors[y[v]],g=B.GLTFUtils.GetBufferFromAccessor(e,A),"NORMAL"===v)m.normals=new Float32Array(g.length),m.normals.set(g);else if("POSITION"===v){if(W.GLTFFileLoader.HomogeneousCoordinates){m.positions=new Float32Array(g.length-g.length/4);for(var b=0;b<g.length;b+=4)m.positions[b]=g[b],m.positions[b+1]=g[b+1],m.positions[b+2]=g[b+2]}else m.positions=new Float32Array(g.length),m.positions.set(g);u.push(m.positions.length)}else if(-1!==v.indexOf("TEXCOORD_")){var T=Number(v.split("_")[1]),L=W.VertexBuffer.UVKind+(0===T?"":T+1),E=new Float32Array(g.length);E.set(g),N(E),m.set(E,L)}else"JOINT"===v?(m.matricesIndices=new Float32Array(g.length),m.matricesIndices.set(g)):"WEIGHT"===v?(m.matricesWeights=new Float32Array(g.length),m.matricesWeights.set(g)):"COLOR"===v&&(m.colors=new Float32Array(g.length),m.colors.set(g));if(A=e.accessors[_.indices])g=B.GLTFUtils.GetBufferFromAccessor(e,A),m.indices=new Int32Array(g.length),m.indices.set(g),d.push(m.indices.length);else{var x=[];for(b=0;b<m.positions.length/3;b++)x.push(b);m.indices=new Int32Array(x),d.push(m.indices.length)}s?s.merge(m):s=m;var O=e.scene.getMaterialByID(_.material);i.push(null===O?B.GLTFUtils.GetDefaultMaterial(e.scene):O),l.push(0===l.length?0:l[l.length-1]+u[u.length-2]),c.push(0===c.length?0:c[c.length-1]+d[d.length-2])}}1<i.length?(a=new W.MultiMaterial("multimat"+r,e.scene)).subMaterials=i:a=new W.StandardMaterial("multimat"+r,e.scene),1===i.length&&(a=i[0]),o.material||(o.material=a),new W.Geometry(r,e.scene,s,!1,o),o.computeWorldMatrix(!0),o.subMeshes=[];var M=0;for(f=0;f<n.length;f++){var w;h=n[f];if(w=e.meshes[h])for(p=0;p<w.primitives.length;p++)w.primitives[p].mode,W.SubMesh.AddToMesh(M,l[M],u[M],c[M],d[M],o,o,!0),M++}return o},M=function(e,t,n,r){e.position&&(e.position=t),(e.rotationQuaternion||e.rotation)&&(e.rotationQuaternion=n),e.scaling&&(e.scaling=r)},s=function(e,t,n,r){var o=null;if(e.importOnlyMeshes&&(t.skin||t.meshes)&&e.importMeshesNames&&0<e.importMeshesNames.length&&-1===e.importMeshesNames.indexOf(t.name||""))return null;if(t.skin){if(t.meshes){var a=e.skins[t.skin];(i=O(e,t,t.meshes,n,t.babylonNode)).skeleton=e.scene.getLastSkeletonByID(t.skin),null===i.skeleton&&(i.skeleton=x(e,a,0,a.babylonSkeleton,t.skin),a.babylonSkeleton||(a.babylonSkeleton=i.skeleton)),o=i}}else if(t.meshes){var i;o=i=O(e,t,t.mesh?[t.mesh]:t.meshes,n,t.babylonNode)}else if(!t.light||t.babylonNode||e.importOnlyMeshes){if(t.camera&&!t.babylonNode&&!e.importOnlyMeshes){var s=e.cameras[t.camera];if(s)if("orthographic"===s.type){var l=new W.FreeCamera(t.camera,W.Vector3.Zero(),e.scene,!1);l.name=t.name||"",l.mode=W.Camera.ORTHOGRAPHIC_CAMERA,l.attachControl(e.scene.getEngine().getRenderingCanvas()),o=l}else if("perspective"===s.type){var u=s[s.type],c=new W.FreeCamera(t.camera,W.Vector3.Zero(),e.scene,!1);c.name=t.name||"",c.attachControl(e.scene.getEngine().getRenderingCanvas()),u.aspectRatio||(u.aspectRatio=e.scene.getEngine().getRenderWidth()/e.scene.getEngine().getRenderHeight()),u.znear&&u.zfar&&(c.maxZ=u.zfar,c.minZ=u.znear),o=c}}}else{var d=e.lights[t.light];if(d)if("ambient"===d.type){var f=d[d.type],h=new W.HemisphericLight(t.light,W.Vector3.Zero(),e.scene);h.name=t.name||"",f.color&&(h.diffuse=W.Color3.FromArray(f.color)),o=h}else if("directional"===d.type){var p=d[d.type],m=new W.DirectionalLight(t.light,W.Vector3.Zero(),e.scene);m.name=t.name||"",p.color&&(m.diffuse=W.Color3.FromArray(p.color)),o=m}else if("point"===d.type){var _=d[d.type],y=new W.PointLight(t.light,W.Vector3.Zero(),e.scene);y.name=t.name||"",_.color&&(y.diffuse=W.Color3.FromArray(_.color)),o=y}else if("spot"===d.type){var A=d[d.type],g=new W.SpotLight(t.light,W.Vector3.Zero(),W.Vector3.Zero(),0,0,e.scene);g.name=t.name||"",A.color&&(g.diffuse=W.Color3.FromArray(A.color)),A.fallOfAngle&&(g.angle=A.fallOfAngle),A.fallOffExponent&&(g.exponent=A.fallOffExponent),o=g}}if(!t.jointName){if(t.babylonNode)return t.babylonNode;if(null===o){var v=new W.Mesh(t.name||"",e.scene);o=t.babylonNode=v}}if(null!==o){if(t.matrix&&o instanceof W.Mesh)!(function(e,t,n){if(t.matrix){var r=new W.Vector3(0,0,0),o=new W.Quaternion,a=new W.Vector3(0,0,0);W.Matrix.FromArray(t.matrix).decompose(a,o,r),M(e,r,o,a)}else t.translation&&t.rotation&&t.scale&&M(e,W.Vector3.FromArray(t.translation),W.Quaternion.FromArray(t.rotation),W.Vector3.FromArray(t.scale));e.computeWorldMatrix(!0)})(o,t);else{var b=t.translation||[0,0,0],T=t.rotation||[0,0,0,1],L=t.scale||[1,1,1];M(o,W.Vector3.FromArray(b),W.Quaternion.FromArray(T),W.Vector3.FromArray(L))}o.updateCache(!0),t.babylonNode=o}return o},l=function(e,t,n,r){void 0===r&&(r=!1);var o=e.nodes[t],a=null;if(r=!(e.importOnlyMeshes&&!r&&e.importMeshesNames)||(-1!==e.importMeshesNames.indexOf(o.name||"")||0===e.importMeshesNames.length),!o.jointName&&r&&null!==(a=s(e,o,t))&&(a.id=t,a.parent=n),o.children)for(var i=0;i<o.children.length;i++)l(e,o.children[i],a,r)},d=function(e){var t=e.currentScene;if(t)for(var n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null);else for(var r in e.scenes){t=e.scenes[r];for(n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null)}!(function(e){for(var t in e.animations){var n=e.animations[t];if(n.channels&&n.samplers)for(var r=null,o=0;o<n.channels.length;o++){var a=n.channels[o],i=n.samplers[a.sampler];if(i){var s=null,l=null;n.parameters?(s=n.parameters[i.input],l=n.parameters[i.output]):(s=i.input,l=i.output);var u=B.GLTFUtils.GetBufferFromAccessor(e,e.accessors[s]),c=B.GLTFUtils.GetBufferFromAccessor(e,e.accessors[l]),d=a.target.id,f=e.scene.getNodeByID(d);if(null===f&&(f=e.scene.getNodeByName(d)),null!==f){var h=f instanceof W.Bone,p=a.target.path,m=w.indexOf(p);-1!==m&&(p=S[m]);var _=W.Animation.ANIMATIONTYPE_MATRIX;h||("rotationQuaternion"===p?(_=W.Animation.ANIMATIONTYPE_QUATERNION,f.rotationQuaternion=new W.Quaternion):_=W.Animation.ANIMATIONTYPE_VECTOR3);var y=null,A=[],g=0,v=!1;h&&r&&r.getKeys().length===u.length&&(y=r,v=!0),v||(y=new W.Animation(t,h?"_matrix":p,1,_,W.Animation.ANIMATIONLOOPMODE_CYCLE));for(var b=0;b<u.length;b++){var T=null;if("rotationQuaternion"===p?(T=W.Quaternion.FromArray([c[g],c[g+1],c[g+2],c[g+3]]),g+=4):(T=W.Vector3.FromArray([c[g],c[g+1],c[g+2]]),g+=3),h){var L=f,E=W.Vector3.Zero(),x=new W.Quaternion,O=W.Vector3.Zero(),M=L.getBaseMatrix();v&&r&&(M=r.getKeys()[b].value),M.decompose(O,x,E),"position"===p?E=T:"rotationQuaternion"===p?x=T:O=T,T=W.Matrix.Compose(O,x,E)}v?r&&(r.getKeys()[b].value=T):A.push({frame:u[b],value:T})}!v&&y&&(y.setKeys(A),f.animations.push(y)),r=y,e.scene.stopAnimation(f),e.scene.beginAnimation(f,0,u[u.length-1],!0,1)}else W.Tools.Warn("Creating animation named "+t+". But cannot find node named "+d+" to attach to")}}}})(e);for(n=0;n<e.scene.skeletons.length;n++){var o=e.scene.skeletons[n];e.scene.beginAnimation(o,0,Number.MAX_VALUE,!0,1)}},H=function(t,n,r,o,a,i){return function(e){!(function(e,n,t,r,o){var a=r.values||t.parameters,i=t.uniforms;for(var s in o){var l=o[s],u=l.type,c=a[i[s]];if(void 0===c&&(c=l.value),c){var d=function(t){return function(e){l.value&&t&&(n.setTexture(t,e),delete o[t])}};u===B.EParameterType.SAMPLER_2D?B.GLTFLoaderExtension.LoadTextureAsync(e,r.values?c:l.value,d(s),(function(){return d(null)})):l.value&&B.GLTFUtils.SetUniform(n,s,r.values?c:l.value,u)&&delete o[s]}}})(t,n,r,o,a),n.onBind=function(e){!(function(e,t,n,r,o,a,i){var s=a.values||o.parameters;for(var l in n){var u=n[l],c=u.type;if(c===B.EParameterType.FLOAT_MAT2||c===B.EParameterType.FLOAT_MAT3||c===B.EParameterType.FLOAT_MAT4)if(!u.semantic||u.source||u.node){if(u.semantic&&(u.source||u.node)){var d=t.scene.getNodeByName(u.source||u.node||"");if(null===d&&(d=t.scene.getNodeByID(u.source||u.node||"")),null===d)continue;B.GLTFUtils.SetMatrix(t.scene,d,u,l,r.getEffect())}}else B.GLTFUtils.SetMatrix(t.scene,e,u,l,r.getEffect());else{var f=s[o.uniforms[l]];if(!f)continue;if(c===B.EParameterType.SAMPLER_2D){var h=t.textures[a.values?f:u.value].babylonTexture;if(null==h)continue;r.getEffect().setTexture(l,h)}else B.GLTFUtils.SetUniform(r.getEffect(),l,f,c)}}i(r)})(e,t,a,n,r,o,i)}}},j=function(e,t,n){for(var r in t.uniforms){var o=t.uniforms[r],a=t.parameters[o];if(e.currentIdentifier===r&&a.semantic&&!a.source&&!a.node){var i=V.indexOf(a.semantic);if(-1!==i)return delete n[r],U[i]}}return e.currentIdentifier},f=function(e){for(var t in e.materials)B.GLTFLoaderExtension.LoadMaterialAsync(e,t,(function(e){}),(function(){}))},t=(function(){function e(){}return e.CreateRuntime=function(e,t,n){var r={extensions:{},accessors:{},buffers:{},bufferViews:{},meshes:{},lights:{},cameras:{},nodes:{},images:{},textures:{},shaders:{},programs:{},samplers:{},techniques:{},materials:{},animations:{},skins:{},extensionsUsed:[],scenes:{},buffersCount:0,shaderscount:0,scene:t,rootUrl:n,loadedBufferCount:0,loadedBufferViews:{},loadedShaderCount:0,importOnlyMeshes:!1,dummyNodes:[]};return e.extensions&&o(e.extensions,"extensions",r),e.extensionsUsed&&o(e.extensionsUsed,"extensionsUsed",r),e.buffers&&(function(e,t){for(var n in e){var r=e[n];t.buffers[n]=r,t.buffersCount++}})(e.buffers,r),e.bufferViews&&o(e.bufferViews,"bufferViews",r),e.accessors&&o(e.accessors,"accessors",r),e.meshes&&o(e.meshes,"meshes",r),e.lights&&o(e.lights,"lights",r),e.cameras&&o(e.cameras,"cameras",r),e.nodes&&o(e.nodes,"nodes",r),e.images&&o(e.images,"images",r),e.textures&&o(e.textures,"textures",r),e.shaders&&(function(e,t){for(var n in e){var r=e[n];t.shaders[n]=r,t.shaderscount++}})(e.shaders,r),e.programs&&o(e.programs,"programs",r),e.samplers&&o(e.samplers,"samplers",r),e.techniques&&o(e.techniques,"techniques",r),e.materials&&o(e.materials,"materials",r),e.animations&&o(e.animations,"animations",r),e.skins&&o(e.skins,"skins",r),e.scenes&&(r.scenes=e.scenes),e.scene&&e.scenes&&(r.currentScene=e.scenes[e.scene]),r},e.LoadBufferAsync=function(e,t,n,r,o){var a=e.buffers[t];W.Tools.IsBase64(a.uri)?setTimeout((function(){return n(new Uint8Array(W.Tools.DecodeBase64(a.uri)))})):W.Tools.LoadFile(e.rootUrl+a.uri,(function(e){return n(new Uint8Array(e))}),o,void 0,!0,(function(e){e&&r(e.status+" "+e.statusText)}))},e.LoadTextureBufferAsync=function(e,t,n,r){var o=e.textures[t];if(o&&o.source)if(o.babylonTexture)n(null);else{var a=e.images[o.source];W.Tools.IsBase64(a.uri)?setTimeout((function(){return n(new Uint8Array(W.Tools.DecodeBase64(a.uri)))})):W.Tools.LoadFile(e.rootUrl+a.uri,(function(e){return n(new Uint8Array(e))}),void 0,void 0,!0,(function(e){e&&r(e.status+" "+e.statusText)}))}else r("")},e.CreateTextureAsync=function(e,t,n,r,o){var a=e.textures[t];if(a.babylonTexture)r(a.babylonTexture);else{var i=e.samplers[a.sampler],s=i.minFilter===B.ETextureFilterType.NEAREST_MIPMAP_NEAREST||i.minFilter===B.ETextureFilterType.NEAREST_MIPMAP_LINEAR||i.minFilter===B.ETextureFilterType.LINEAR_MIPMAP_NEAREST||i.minFilter===B.ETextureFilterType.LINEAR_MIPMAP_LINEAR,l=W.Texture.BILINEAR_SAMPLINGMODE,u=null==n?new Blob:new Blob([n]),c=URL.createObjectURL(u),d=function(){return URL.revokeObjectURL(c)},f=new W.Texture(c,e.scene,!s,!0,l,d,d);void 0!==i.wrapS&&(f.wrapU=B.GLTFUtils.GetWrapMode(i.wrapS)),void 0!==i.wrapT&&(f.wrapV=B.GLTFUtils.GetWrapMode(i.wrapT)),f.name=t,r(a.babylonTexture=f)}},e.LoadShaderStringAsync=function(e,t,n,r){var o=e.shaders[t];if(W.Tools.IsBase64(o.uri)){var a=atob(o.uri.split(",")[1]);n&&n(a)}else W.Tools.LoadFile(e.rootUrl+o.uri,n,void 0,void 0,!1,(function(e){e&&r&&r(e.status+" "+e.statusText)}))},e.LoadMaterialAsync=function(e,t,n,r){var o=e.materials[t];if(o.technique){var a=e.techniques[o.technique];if(!a){var i=new W.StandardMaterial(t,e.scene);return i.diffuseColor=new W.Color3(.5,.5,.5),i.sideOrientation=W.Material.CounterClockWiseSideOrientation,void n(i)}var s=e.programs[a.program],l=a.states,u=W.Effect.ShadersStore[s.vertexShader+"VertexShader"],c=W.Effect.ShadersStore[s.fragmentShader+"PixelShader"],d="",f="",h=new G(u),p=new G(c),m={},_=[],y=[],A=[];for(var g in a.uniforms){var v=a.uniforms[g],b=a.parameters[v];if(!(m[g]=b).semantic||b.node||b.source)b.type===B.EParameterType.SAMPLER_2D?A.push(g):_.push(g);else{var T=V.indexOf(b.semantic);-1!==T?(_.push(U[T]),delete m[g]):_.push(g)}}for(var L in a.attributes){var E=a.attributes[L];if((M=a.parameters[E]).semantic){var x=k(M);x&&y.push(x)}}for(;!h.isEnd()&&h.getNextToken();){if(h.currentToken===D.IDENTIFIER){var O=!1;for(var L in a.attributes){E=a.attributes[L];var M=a.parameters[E];if(h.currentIdentifier===L&&M.semantic){d+=k(M),O=!0;break}}O||(d+=j(h,a,m))}else d+=h.currentString}for(;!p.isEnd()&&p.getNextToken();){p.currentToken===D.IDENTIFIER?f+=j(p,a,m):f+=p.currentString}var w={vertex:s.vertexShader+t,fragment:s.fragmentShader+t},S={attributes:y,uniforms:_,samplers:A,needAlphaBlending:l&&l.enable&&-1!==l.enable.indexOf(3042)};W.Effect.ShadersStore[s.vertexShader+t+"VertexShader"]=d,W.Effect.ShadersStore[s.fragmentShader+t+"PixelShader"]=f;var N,F,C,P=new W.ShaderMaterial(t,e.scene,w,S);if(P.onError=(N=s,F=P,C=r,function(e,t){F.dispose(!0),C("Cannot compile program named "+N.name+". Error: "+t+". Default material will be applied")}),P.onCompiled=H(e,P,a,o,m,n),P.sideOrientation=W.Material.CounterClockWiseSideOrientation,l&&l.functions){var I=l.functions;I.cullFace&&I.cullFace[0]!==B.ECullingType.BACK&&(P.backFaceCulling=!1);var R=I.blendFuncSeparate;R&&(R[0]===B.EBlendingFunction.SRC_ALPHA&&R[1]===B.EBlendingFunction.ONE_MINUS_SRC_ALPHA&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_COMBINE:R[0]===B.EBlendingFunction.ONE&&R[1]===B.EBlendingFunction.ONE&&R[2]===B.EBlendingFunction.ZERO&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_ONEONE:R[0]===B.EBlendingFunction.SRC_ALPHA&&R[1]===B.EBlendingFunction.ONE&&R[2]===B.EBlendingFunction.ZERO&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_ADD:R[0]===B.EBlendingFunction.ZERO&&R[1]===B.EBlendingFunction.ONE_MINUS_SRC_COLOR&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_SUBTRACT:R[0]===B.EBlendingFunction.DST_COLOR&&R[1]===B.EBlendingFunction.ZERO&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE?P.alphaMode=W.Engine.ALPHA_MULTIPLY:R[0]===B.EBlendingFunction.SRC_ALPHA&&R[1]===B.EBlendingFunction.ONE_MINUS_SRC_COLOR&&R[2]===B.EBlendingFunction.ONE&&R[3]===B.EBlendingFunction.ONE&&(P.alphaMode=W.Engine.ALPHA_MAXIMIZED))}}else r&&r("No technique found.")},e})();B.GLTFLoaderBase=t;var n=(function(){function t(){this.state=null}return t.RegisterExtension=function(e){t.Extensions[e.name]?W.Tools.Error('Tool with the same name "'+e.name+'" already exists'):t.Extensions[e.name]=e},t.prototype.dispose=function(){},t.prototype._importMeshAsync=function(s,e,t,n,l,u,r){var c=this;return e.useRightHandedSystem=!0,B.GLTFLoaderExtension.LoadRuntimeAsync(e,t,n,(function(e){e.importOnlyMeshes=!0,""===s?e.importMeshesNames=[]:"string"==typeof s?e.importMeshesNames=[s]:!s||s instanceof Array?(e.importMeshesNames=[],W.Tools.Warn("Argument meshesNames must be of type string or string[]")):e.importMeshesNames=[s],c._createNodes(e);var t=new Array,n=new Array;for(var r in e.nodes){var o=e.nodes[r];o.babylonNode instanceof W.AbstractMesh&&t.push(o.babylonNode)}for(var a in e.skins){var i=e.skins[a];i.babylonSkeleton instanceof W.Skeleton&&n.push(i.babylonSkeleton)}c._loadBuffersAsync(e,(function(){c._loadShadersAsync(e,(function(){f(e),d(e),!W.GLTFFileLoader.IncrementalLoading&&l&&l(t,n)}))}),u),W.GLTFFileLoader.IncrementalLoading&&l&&l(t,n)}),r),!0},t.prototype.importMeshAsync=function(e,r,o,a,i){var s=this;return new Promise(function(n,t){s._importMeshAsync(e,r,o,a,(function(e,t){n({meshes:e,particleSystems:[],skeletons:t,animationGroups:[]})}),i,(function(e){t(new Error(e))}))})},t.prototype._loadAsync=function(e,t,n,r,o,a){var i=this;e.useRightHandedSystem=!0,B.GLTFLoaderExtension.LoadRuntimeAsync(e,t,n,(function(e){B.GLTFLoaderExtension.LoadRuntimeExtensionsAsync(e,(function(){i._createNodes(e),i._loadBuffersAsync(e,(function(){i._loadShadersAsync(e,(function(){f(e),d(e),W.GLTFFileLoader.IncrementalLoading||r()}))})),W.GLTFFileLoader.IncrementalLoading&&r()}),a)}),a)},t.prototype.loadAsync=function(n,r,o,a){var i=this;return new Promise(function(e,t){i._loadAsync(n,r,o,(function(){e()}),a,(function(e){t(new Error(e))}))})},t.prototype._loadShadersAsync=function(r,o){var e=!1,t=function(t,n){B.GLTFLoaderExtension.LoadShaderStringAsync(r,t,(function(e){e instanceof ArrayBuffer||(r.loadedShaderCount++,e&&(W.Effect.ShadersStore[t+(n.type===B.EShaderType.VERTEX?"VertexShader":"PixelShader")]=e),r.loadedShaderCount===r.shaderscount&&o())}),(function(){W.Tools.Error("Error when loading shader program named "+t+" located at "+n.uri)}))};for(var n in r.shaders){e=!0;var a=r.shaders[n];a?t.bind(this,n,a)():W.Tools.Error("No shader named: "+n)}e||o()},t.prototype._loadBuffersAsync=function(r,o,e){var t=!1,n=function(t,n){B.GLTFLoaderExtension.LoadBufferAsync(r,t,(function(e){r.loadedBufferCount++,e&&(e.byteLength!=r.buffers[t].byteLength&&W.Tools.Error("Buffer named "+t+" is length "+e.byteLength+". Expected: "+n.byteLength),r.loadedBufferViews[t]=e),r.loadedBufferCount===r.buffersCount&&o()}),(function(){W.Tools.Error("Error when loading buffer named "+t+" located at "+n.uri)}))};for(var a in r.buffers){t=!0;var i=r.buffers[a];i?n.bind(this,a,i)():W.Tools.Error("No buffer named: "+a)}t||o()},t.prototype._createNodes=function(e){var t=e.currentScene;if(t)for(var n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null);else for(var r in e.scenes){t=e.scenes[r];for(n=0;n<t.nodes.length;n++)l(e,t.nodes[n],null)}},t.Extensions={},t})();B.GLTFLoader=n,W.GLTFFileLoader._CreateGLTFLoaderV1=function(){return new n}})(W.GLTF1||(W.GLTF1={}))})(BABYLON||(BABYLON={})),(function(i){var s,e;s=i.GLTF1||(i.GLTF1={}),e=(function(){function o(){}return o.SetMatrix=function(e,t,n,r,o){var a=null;if("MODEL"===n.semantic?a=t.getWorldMatrix():"PROJECTION"===n.semantic?a=e.getProjectionMatrix():"VIEW"===n.semantic?a=e.getViewMatrix():"MODELVIEWINVERSETRANSPOSE"===n.semantic?a=i.Matrix.Transpose(t.getWorldMatrix().multiply(e.getViewMatrix()).invert()):"MODELVIEW"===n.semantic?a=t.getWorldMatrix().multiply(e.getViewMatrix()):"MODELVIEWPROJECTION"===n.semantic?a=t.getWorldMatrix().multiply(e.getTransformMatrix()):"MODELINVERSE"===n.semantic?a=t.getWorldMatrix().invert():"VIEWINVERSE"===n.semantic?a=e.getViewMatrix().invert():"PROJECTIONINVERSE"===n.semantic?a=e.getProjectionMatrix().invert():"MODELVIEWINVERSE"===n.semantic?a=t.getWorldMatrix().multiply(e.getViewMatrix()).invert():"MODELVIEWPROJECTIONINVERSE"===n.semantic?a=t.getWorldMatrix().multiply(e.getTransformMatrix()).invert():"MODELINVERSETRANSPOSE"===n.semantic&&(a=i.Matrix.Transpose(t.getWorldMatrix().invert())),a)switch(n.type){case s.EParameterType.FLOAT_MAT2:o.setMatrix2x2(r,i.Matrix.GetAsMatrix2x2(a));break;case s.EParameterType.FLOAT_MAT3:o.setMatrix3x3(r,i.Matrix.GetAsMatrix3x3(a));break;case s.EParameterType.FLOAT_MAT4:o.setMatrix(r,a)}},o.SetUniform=function(e,t,n,r){switch(r){case s.EParameterType.FLOAT:return e.setFloat(t,n),!0;case s.EParameterType.FLOAT_VEC2:return e.setVector2(t,i.Vector2.FromArray(n)),!0;case s.EParameterType.FLOAT_VEC3:return e.setVector3(t,i.Vector3.FromArray(n)),!0;case s.EParameterType.FLOAT_VEC4:return e.setVector4(t,i.Vector4.FromArray(n)),!0;default:return!1}},o.GetWrapMode=function(e){switch(e){case s.ETextureWrapMode.CLAMP_TO_EDGE:return i.Texture.CLAMP_ADDRESSMODE;case s.ETextureWrapMode.MIRRORED_REPEAT:return i.Texture.MIRROR_ADDRESSMODE;case s.ETextureWrapMode.REPEAT:default:return i.Texture.WRAP_ADDRESSMODE}},o.GetByteStrideFromType=function(e){switch(e.type){case"VEC2":return 2;case"VEC3":return 3;case"VEC4":case"MAT2":return 4;case"MAT3":return 9;case"MAT4":return 16;default:return 1}},o.GetTextureFilterMode=function(e){switch(e){case s.ETextureFilterType.LINEAR:case s.ETextureFilterType.LINEAR_MIPMAP_NEAREST:case s.ETextureFilterType.LINEAR_MIPMAP_LINEAR:return i.Texture.TRILINEAR_SAMPLINGMODE;case s.ETextureFilterType.NEAREST:case s.ETextureFilterType.NEAREST_MIPMAP_NEAREST:return i.Texture.NEAREST_SAMPLINGMODE;default:return i.Texture.BILINEAR_SAMPLINGMODE}},o.GetBufferFromBufferView=function(e,t,n,r,o){n=t.byteOffset+n;var a=e.loadedBufferViews[t.buffer];if(n+r>a.byteLength)throw new Error("Buffer access is out of range");var i=a.buffer;switch(n+=a.byteOffset,o){case s.EComponentType.BYTE:return new Int8Array(i,n,r);case s.EComponentType.UNSIGNED_BYTE:return new Uint8Array(i,n,r);case s.EComponentType.SHORT:return new Int16Array(i,n,r);case s.EComponentType.UNSIGNED_SHORT:return new Uint16Array(i,n,r);default:return new Float32Array(i,n,r)}},o.GetBufferFromAccessor=function(e,t){var n=e.bufferViews[t.bufferView],r=t.count*o.GetByteStrideFromType(t);return o.GetBufferFromBufferView(e,n,t.byteOffset,r,t.componentType)},o.DecodeBufferToText=function(e){for(var t="",n=e.byteLength,r=0;r<n;++r)t+=String.fromCharCode(e[r]);return t},o.GetDefaultMaterial=function(e){if(!o._DefaultMaterial){i.Effect.ShadersStore.GLTFDefaultMaterialVertexShader=["precision highp float;","","uniform mat4 worldView;","uniform mat4 projection;","","attribute vec3 position;","","void main(void)","{","    gl_Position = projection * worldView * vec4(position, 1.0);","}"].join("\n"),i.Effect.ShadersStore.GLTFDefaultMaterialPixelShader=["precision highp float;","","uniform vec4 u_emission;","","void main(void)","{","    gl_FragColor = u_emission;","}"].join("\n");var t={attributes:["position"],uniforms:["worldView","projection","u_emission"],samplers:new Array,needAlphaBlending:!1};(o._DefaultMaterial=new i.ShaderMaterial("GLTFDefaultMaterial",e,{vertex:"GLTFDefaultMaterial",fragment:"GLTFDefaultMaterial"},t)).setColor4("u_emission",new i.Color4(.5,.5,.5,1))}return o._DefaultMaterial},o._DefaultMaterial=null,o})(),s.GLTFUtils=e})(BABYLON||(BABYLON={})),(function(e){var s,t;s=e.GLTF1||(e.GLTF1={}),t=(function(){function i(e){this._name=e}return Object.defineProperty(i.prototype,"name",{get:function(){return this._name},enumerable:!0,configurable:!0}),i.prototype.loadRuntimeAsync=function(e,t,n,r,o){return!1},i.prototype.loadRuntimeExtensionsAsync=function(e,t,n){return!1},i.prototype.loadBufferAsync=function(e,t,n,r,o){return!1},i.prototype.loadTextureBufferAsync=function(e,t,n,r){return!1},i.prototype.createTextureAsync=function(e,t,n,r,o){return!1},i.prototype.loadShaderStringAsync=function(e,t,n,r){return!1},i.prototype.loadMaterialAsync=function(e,t,n,r){return!1},i.LoadRuntimeAsync=function(t,n,r,o,a){i.ApplyExtensions((function(e){return e.loadRuntimeAsync(t,n,r,o,a)}),(function(){setTimeout((function(){o&&o(s.GLTFLoaderBase.CreateRuntime(n.json,t,r))}))}))},i.LoadRuntimeExtensionsAsync=function(t,n,r){i.ApplyExtensions((function(e){return e.loadRuntimeExtensionsAsync(t,n,r)}),(function(){setTimeout((function(){n()}))}))},i.LoadBufferAsync=function(t,n,r,o,a){i.ApplyExtensions((function(e){return e.loadBufferAsync(t,n,r,o,a)}),(function(){s.GLTFLoaderBase.LoadBufferAsync(t,n,r,o,a)}))},i.LoadTextureAsync=function(t,n,r,o){i.LoadTextureBufferAsync(t,n,(function(e){e&&i.CreateTextureAsync(t,n,e,r,o)}),o)},i.LoadShaderStringAsync=function(t,n,r,o){i.ApplyExtensions((function(e){return e.loadShaderStringAsync(t,n,r,o)}),(function(){s.GLTFLoaderBase.LoadShaderStringAsync(t,n,r,o)}))},i.LoadMaterialAsync=function(t,n,r,o){i.ApplyExtensions((function(e){return e.loadMaterialAsync(t,n,r,o)}),(function(){s.GLTFLoaderBase.LoadMaterialAsync(t,n,r,o)}))},i.LoadTextureBufferAsync=function(t,n,r,o){i.ApplyExtensions((function(e){return e.loadTextureBufferAsync(t,n,r,o)}),(function(){s.GLTFLoaderBase.LoadTextureBufferAsync(t,n,r,o)}))},i.CreateTextureAsync=function(t,n,r,o,a){i.ApplyExtensions((function(e){return e.createTextureAsync(t,n,r,o,a)}),(function(){s.GLTFLoaderBase.CreateTextureAsync(t,n,r,o,a)}))},i.ApplyExtensions=function(e,t){for(var n in s.GLTFLoader.Extensions){if(e(s.GLTFLoader.Extensions[n]))return}t()},i})(),s.GLTFLoaderExtension=t})(BABYLON||(BABYLON={}));var __extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)};return function(e,t){function n(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}})();!(function(e){var l,t;l=e.GLTF1||(e.GLTF1={}),t=(function(e){function t(){return e.call(this,"KHR_binary_glTF")||this}return __extends(t,e),t.prototype.loadRuntimeAsync=function(e,t,n,r,o){var a=t.json.extensionsUsed;return!(!a||-1===a.indexOf(this.name)||!t.bin)&&(this._bin=t.bin,r(l.GLTFLoaderBase.CreateRuntime(t.json,e,n)),!0)},t.prototype.loadBufferAsync=function(e,t,n,r){return-1!==e.extensionsUsed.indexOf(this.name)&&("binary_glTF"===t&&(n(this._bin),!0))},t.prototype.loadTextureBufferAsync=function(e,t,n,r){var o=e.textures[t],a=e.images[o.source];if(!(a.extensions&&this.name in a.extensions))return!1;var i=a.extensions[this.name],s=e.bufferViews[i.bufferView];return n(l.GLTFUtils.GetBufferFromBufferView(e,s,0,s.byteLength,l.EComponentType.UNSIGNED_BYTE)),!0},t.prototype.loadShaderStringAsync=function(e,t,n,r){var o=e.shaders[t];if(!(o.extensions&&this.name in o.extensions))return!1;var a=o.extensions[this.name],i=e.bufferViews[a.bufferView],s=l.GLTFUtils.GetBufferFromBufferView(e,i,0,i.byteLength,l.EComponentType.UNSIGNED_BYTE);return setTimeout((function(){var e=l.GLTFUtils.DecodeBufferToText(s);n(e)})),!0},t})(l.GLTFLoaderExtension),l.GLTFBinaryExtension=t,l.GLTFLoader.RegisterExtension(new t)})(BABYLON||(BABYLON={}));var BABYLON;__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)};return function(e,t){function n(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}})();!(function(p){var i,e;i=p.GLTF1||(p.GLTF1={}),e=(function(e){function t(){return e.call(this,"KHR_materials_common")||this}return __extends(t,e),t.prototype.loadRuntimeExtensionsAsync=function(e,t,n){if(!e.extensions)return!1;var r=e.extensions[this.name];if(!r)return!1;var o=r.lights;if(o)for(var a in o){var i=o[a];switch(i.type){case"ambient":var s=new p.HemisphericLight(i.name,new p.Vector3(0,1,0),e.scene),l=i.ambient;l&&(s.diffuse=p.Color3.FromArray(l.color||[1,1,1]));break;case"point":var u=new p.PointLight(i.name,new p.Vector3(10,10,10),e.scene),c=i.point;c&&(u.diffuse=p.Color3.FromArray(c.color||[1,1,1]));break;case"directional":var d=new p.DirectionalLight(i.name,new p.Vector3(0,-1,0),e.scene),f=i.directional;f&&(d.diffuse=p.Color3.FromArray(f.color||[1,1,1]));break;case"spot":var h=i.spot;if(h)new p.SpotLight(i.name,new p.Vector3(0,10,0),new p.Vector3(0,-1,0),h.fallOffAngle||Math.PI,h.fallOffExponent||0,e.scene).diffuse=p.Color3.FromArray(h.color||[1,1,1]);break;default:p.Tools.Warn('GLTF Material Common extension: light type "'+i.type+"” not supported")}}return!1},t.prototype.loadMaterialAsync=function(e,t,n,r){var o=e.materials[t];if(!o||!o.extensions)return!1;var a=o.extensions[this.name];if(!a)return!1;var i=new p.StandardMaterial(t,e.scene);return i.sideOrientation=p.Material.CounterClockWiseSideOrientation,"CONSTANT"===a.technique&&(i.disableLighting=!0),i.backFaceCulling=void 0!==a.doubleSided&&!a.doubleSided,i.alpha=void 0===a.values.transparency?1:a.values.transparency,i.specularPower=void 0===a.values.shininess?0:a.values.shininess,"string"==typeof a.values.ambient?this._loadTexture(e,a.values.ambient,i,"ambientTexture",r):i.ambientColor=p.Color3.FromArray(a.values.ambient||[0,0,0]),"string"==typeof a.values.diffuse?this._loadTexture(e,a.values.diffuse,i,"diffuseTexture",r):i.diffuseColor=p.Color3.FromArray(a.values.diffuse||[0,0,0]),"string"==typeof a.values.emission?this._loadTexture(e,a.values.emission,i,"emissiveTexture",r):i.emissiveColor=p.Color3.FromArray(a.values.emission||[0,0,0]),"string"==typeof a.values.specular?this._loadTexture(e,a.values.specular,i,"specularTexture",r):i.specularColor=p.Color3.FromArray(a.values.specular||[0,0,0]),!0},t.prototype._loadTexture=function(t,n,r,o,a){i.GLTFLoaderBase.LoadTextureBufferAsync(t,n,(function(e){i.GLTFLoaderBase.CreateTextureAsync(t,n,e,(function(e){return r[o]=e}),a)}),a)},t})(i.GLTFLoaderExtension),i.GLTFMaterialsCommonExtension=e,i.GLTFLoader.RegisterExtension(new e)})(BABYLON||(BABYLON={})),(function(b){!(function(e){var v=(function(){function e(){}return e.Get=function(e,t,n){if(!t||null==n||!t[n])throw new Error(e+": Failed to find index ("+n+")");return t[n]},e.Assign=function(e){if(e)for(var t=0;t<e.length;t++)e[t].index=t},e})();e.ArrayItem=v;var t=(function(){function p(e){this._completePromises=new Array,this._disposed=!1,this._state=null,this._extensions={},this._defaultBabylonMaterialData={},this._requests=new Array,this._parent=e}return p.RegisterExtension=function(e,t){p.UnregisterExtension(e)&&b.Tools.Warn("Extension with the name '"+e+"' already exists"),p._ExtensionFactories[e]=t,p._ExtensionNames.push(e)},p.UnregisterExtension=function(e){if(!p._ExtensionFactories[e])return!1;delete p._ExtensionFactories[e];var t=p._ExtensionNames.indexOf(e);return-1!==t&&p._ExtensionNames.splice(t,1),!0},Object.defineProperty(p.prototype,"state",{get:function(){return this._state},enumerable:!0,configurable:!0}),p.prototype.dispose=function(){if(!this._disposed){this._disposed=!0;for(var e=0,t=this._requests;e<t.length;e++){t[e].abort()}for(var n in this._requests.length=0,delete this.gltf,delete this.babylonScene,this._completePromises.length=0,this._extensions){this._extensions[n].dispose&&this._extensions[n].dispose()}this._extensions={},delete this._rootBabylonMesh,delete this._progressCallback,this._parent._clear()}},p.prototype.importMeshAsync=function(a,i,s,l,u,c){var d=this;return Promise.resolve().then((function(){d.babylonScene=i,d._rootUrl=l,d._fileName=c||"scene",d._progressCallback=u,d._loadData(s);var e=null;if(a){var n={};if(d.gltf.nodes)for(var t=0,r=d.gltf.nodes;t<r.length;t++){var o=r[t];o.name&&(n[o.name]=o.index)}e=(a instanceof Array?a:[a]).map((function(e){var t=n[e];if(void 0===t)throw new Error("Failed to find node '"+e+"'");return t}))}return d._loadAsync(e,(function(){return{meshes:d._getMeshes(),particleSystems:[],skeletons:d._getSkeletons(),animationGroups:d._getAnimationGroups()}}))}))},p.prototype.loadAsync=function(e,t,n,r,o){var a=this;return Promise.resolve().then((function(){return a.babylonScene=e,a._rootUrl=n,a._fileName=o||"scene",a._progressCallback=r,a._loadData(t),a._loadAsync(null,(function(){}))}))},p.prototype._loadAsync=function(a,i){var s=this;return Promise.resolve().then((function(){s._uniqueRootUrl=-1===s._rootUrl.indexOf("file:")&&s._fileName?s._rootUrl:""+s._rootUrl+Date.now()+"/",s._loadExtensions(),s._checkExtensions();var e=b.GLTFLoaderState[b.GLTFLoaderState.LOADING]+" => "+b.GLTFLoaderState[b.GLTFLoaderState.READY],t=b.GLTFLoaderState[b.GLTFLoaderState.LOADING]+" => "+b.GLTFLoaderState[b.GLTFLoaderState.COMPLETE];s._parent._startPerformanceCounter(e),s._parent._startPerformanceCounter(t),s._setState(b.GLTFLoaderState.LOADING),s._extensionsOnLoading();var n=new Array;if(a)n.push(s.loadSceneAsync("#/nodes",{nodes:a,index:-1}));else{var r=v.Get("#/scene",s.gltf.scenes,s.gltf.scene||0);n.push(s.loadSceneAsync("#/scenes/"+r.index,r))}s._parent.compileMaterials&&n.push(s._compileMaterialsAsync()),s._parent.compileShadowGenerators&&n.push(s._compileShadowGeneratorsAsync());var o=Promise.all(n).then((function(){return s._setState(b.GLTFLoaderState.READY),s._extensionsOnReady(),s._startAnimations(),i()}));return o.then((function(){s._parent._endPerformanceCounter(e),b.Tools.SetImmediate((function(){s._disposed||Promise.all(s._completePromises).then((function(){s._parent._endPerformanceCounter(t),s._setState(b.GLTFLoaderState.COMPLETE),s._parent.onCompleteObservable.notifyObservers(void 0),s._parent.onCompleteObservable.clear(),s.dispose()}),(function(e){s._parent.onErrorObservable.notifyObservers(e),s._parent.onErrorObservable.clear(),s.dispose()}))}))})),o}),(function(e){throw s._disposed||(s._parent.onErrorObservable.notifyObservers(e),s._parent.onErrorObservable.clear(),s.dispose()),e}))},p.prototype._loadData=function(e){if(this.gltf=e.json,this._setupData(),e.bin){var t=this.gltf.buffers;if(t&&t[0]&&!t[0].uri){var n=t[0];(n.byteLength<e.bin.byteLength-3||n.byteLength>e.bin.byteLength)&&b.Tools.Warn("Binary buffer length ("+n.byteLength+") from JSON does not match chunk length ("+e.bin.byteLength+")"),n._data=Promise.resolve(e.bin)}else b.Tools.Warn("Unexpected BIN chunk")}},p.prototype._setupData=function(){if(v.Assign(this.gltf.accessors),v.Assign(this.gltf.animations),v.Assign(this.gltf.buffers),v.Assign(this.gltf.bufferViews),v.Assign(this.gltf.cameras),v.Assign(this.gltf.images),v.Assign(this.gltf.materials),v.Assign(this.gltf.meshes),v.Assign(this.gltf.nodes),v.Assign(this.gltf.samplers),v.Assign(this.gltf.scenes),v.Assign(this.gltf.skins),v.Assign(this.gltf.textures),this.gltf.nodes){for(var e={},t=0,n=this.gltf.nodes;t<n.length;t++){if((l=n[t]).children)for(var r=0,o=l.children;r<o.length;r++){e[o[r]]=l.index}}for(var a=this._createRootNode(),i=0,s=this.gltf.nodes;i<s.length;i++){var l,u=e[(l=s[i]).index];l.parent=void 0===u?a:this.gltf.nodes[u]}}},p.prototype._loadExtensions=function(){for(var e=0,t=p._ExtensionNames;e<t.length;e++){var n=t[e],r=p._ExtensionFactories[n](this);this._extensions[n]=r,this._parent.onExtensionLoadedObservable.notifyObservers(r)}this._parent.onExtensionLoadedObservable.clear()},p.prototype._checkExtensions=function(){if(this.gltf.extensionsRequired)for(var e=0,t=this.gltf.extensionsRequired;e<t.length;e++){var n=t[e],r=this._extensions[n];if(!r||!r.enabled)throw new Error("Require extension "+n+" is not available")}},p.prototype._setState=function(e){this._state=e,this.log(b.GLTFLoaderState[this._state])},p.prototype._createRootNode=function(){this._rootBabylonMesh=new b.Mesh("__root__",this.babylonScene);var e={_babylonMesh:this._rootBabylonMesh,index:-1};switch(this._parent.coordinateSystemMode){case b.GLTFLoaderCoordinateSystemMode.AUTO:this.babylonScene.useRightHandedSystem||(e.rotation=[0,1,0,0],e.scale=[1,1,-1],p._LoadTransform(e,this._rootBabylonMesh));break;case b.GLTFLoaderCoordinateSystemMode.FORCE_RIGHT_HANDED:this.babylonScene.useRightHandedSystem=!0;break;default:throw new Error("Invalid coordinate system mode ("+this._parent.coordinateSystemMode+")")}return this._parent.onMeshLoadedObservable.notifyObservers(this._rootBabylonMesh),e},p.prototype.loadSceneAsync=function(e,t){var n=this,r=this._extensionsLoadSceneAsync(e,t);if(r)return r;var o=new Array;if(this.logOpen(e+" "+(t.name||"")),t.nodes)for(var a=0,i=t.nodes;a<i.length;a++){var s=i[a],l=v.Get(e+"/nodes/"+s,this.gltf.nodes,s);o.push(this.loadNodeAsync("#/nodes/"+l.index,l,(function(e){e.parent=n._rootBabylonMesh})))}return o.push(this._loadAnimationsAsync()),this.logClose(),Promise.all(o).then((function(){}))},p.prototype._forEachPrimitive=function(e,t){if(e._primitiveBabylonMeshes)for(var n=0,r=e._primitiveBabylonMeshes;n<r.length;n++){t(r[n])}else t(e._babylonMesh)},p.prototype._getMeshes=function(){var e=new Array;e.push(this._rootBabylonMesh);var t=this.gltf.nodes;if(t)for(var n=0,r=t;n<r.length;n++){var o=r[n];if(o._babylonMesh&&e.push(o._babylonMesh),o._primitiveBabylonMeshes)for(var a=0,i=o._primitiveBabylonMeshes;a<i.length;a++){var s=i[a];e.push(s)}}return e},p.prototype._getSkeletons=function(){var e=new Array,t=this.gltf.skins;if(t)for(var n=0,r=t;n<r.length;n++){var o=r[n];o._babylonSkeleton&&e.push(o._babylonSkeleton)}return e},p.prototype._getAnimationGroups=function(){var e=new Array,t=this.gltf.animations;if(t)for(var n=0,r=t;n<r.length;n++){var o=r[n];o._babylonAnimationGroup&&e.push(o._babylonAnimationGroup)}return e},p.prototype._startAnimations=function(){switch(this._parent.animationStartMode){case b.GLTFLoaderAnimationStartMode.NONE:break;case b.GLTFLoaderAnimationStartMode.FIRST:0!==(e=this._getAnimationGroups()).length&&e[0].start(!0);break;case b.GLTFLoaderAnimationStartMode.ALL:for(var e,t=0,n=e=this._getAnimationGroups();t<n.length;t++){n[t].start(!0)}break;default:return void b.Tools.Error("Invalid animation start mode ("+this._parent.animationStartMode+")")}},p.prototype.loadNodeAsync=function(n,r,e){var o=this;void 0===e&&(e=function(){});var t=this._extensionsLoadNodeAsync(n,r,e);if(t)return t;if(r._babylonMesh)throw new Error(n+": Invalid recursive node hierarchy");var a=new Array;this.logOpen(n+" "+(r.name||""));var i=new b.Mesh(r.name||"node"+r.index,this.babylonScene);if((r._babylonMesh=i).setEnabled(!1),p._LoadTransform(r,i),null!=r.mesh){var s=v.Get(n+"/mesh",this.gltf.meshes,r.mesh);a.push(this._loadMeshAsync("#/meshes/"+s.index,r,s,i))}if(null!=r.camera){var l=v.Get(n+"/camera",this.gltf.cameras,r.camera);a.push(this.loadCameraAsync("#/cameras/"+l.index,l,(function(e){e.parent=i})))}if(r.children)for(var u=function(e){var t=v.Get(n+"/children/"+e,c.gltf.nodes,e);a.push(c.loadNodeAsync("#/nodes/"+r.index,t,(function(e){null==t.skin?e.parent=i:e.parent=o._rootBabylonMesh})))},c=this,d=0,f=r.children;d<f.length;d++){u(f[d])}return e(i),this._parent.onMeshLoadedObservable.notifyObservers(i),this.logClose(),Promise.all(a).then((function(){return i.setEnabled(!0),i}))},p.prototype._loadMeshAsync=function(e,t,n,r){var o=this,a=new Array;this.logOpen(e+" "+(n.name||""));var i=n.primitives;if(!i||0===i.length)throw new Error(e+": Primitives are missing");if(v.Assign(i),1===i.length){var s=i[0];a.push(this._loadMeshPrimitiveAsync(e+"/primitives/"+s.index,t,n,s,r))}else{t._primitiveBabylonMeshes=[];for(var l=0,u=i;l<u.length;l++){s=u[l];var c=new b.Mesh((n.name||r.name)+"_"+s.index,this.babylonScene,r);t._primitiveBabylonMeshes.push(c),a.push(this._loadMeshPrimitiveAsync(e+"/primitives/"+s.index,t,n,s,c)),this._parent.onMeshLoadedObservable.notifyObservers(r)}}if(null!=t.skin){var d=v.Get(e+"/skin",this.gltf.skins,t.skin);a.push(this._loadSkinAsync("#/skins/"+d.index,t,d))}return this.logClose(),Promise.all(a).then((function(){o._forEachPrimitive(t,(function(e){e._refreshBoundingInfo(!0)}))}))},p.prototype._loadMeshPrimitiveAsync=function(t,e,n,r,o){var a=this,i=new Array;this.logOpen(""+t),this._createMorphTargets(t,e,n,r,o),i.push(this._loadVertexDataAsync(t,r,o).then((function(e){return a._loadMorphTargetsAsync(t,r,o,e).then((function(){e.applyToMesh(o)}))})));var s=p._GetDrawMode(t,r.mode);if(null==r.material){var l=this._defaultBabylonMaterialData[s];l||(l=this._createDefaultMaterial("__gltf_default",s),this._parent.onMaterialLoadedObservable.notifyObservers(l),this._defaultBabylonMaterialData[s]=l),o.material=l}else{var u=v.Get(t+"/material",this.gltf.materials,r.material);i.push(this._loadMaterialAsync("#/materials/"+u.index,u,o,s,(function(e){o.material=e})))}return this.logClose(),Promise.all(i).then((function(){}))},p.prototype._loadVertexDataAsync=function(o,e,a){var i=this,t=this._extensionsLoadVertexDataAsync(o,e,a);if(t)return t;var s=e.attributes;if(!s)throw new Error(o+": Attributes are missing");var l=new Array,u=new b.Geometry(a.name,this.babylonScene);if(null==e.indices)a.isUnIndexed=!0;else{var n=v.Get(o+"/indices",this.gltf.accessors,e.indices);l.push(this._loadIndicesAccessorAsync("#/accessors/"+n.index,n).then((function(e){u.setIndices(e)})))}var r=function(e,t,n){if(null!=s[e]){a._delayInfo=a._delayInfo||[],-1===a._delayInfo.indexOf(t)&&a._delayInfo.push(t);var r=v.Get(o+"/attributes/"+e,i.gltf.accessors,s[e]);l.push(i._loadVertexAccessorAsync("#/accessors/"+r.index,r,t).then((function(e){u.setVerticesBuffer(e,r.count)}))),n&&n(r)}};return r("POSITION",b.VertexBuffer.PositionKind),r("NORMAL",b.VertexBuffer.NormalKind),r("TANGENT",b.VertexBuffer.TangentKind),r("TEXCOORD_0",b.VertexBuffer.UVKind),r("TEXCOORD_1",b.VertexBuffer.UV2Kind),r("JOINTS_0",b.VertexBuffer.MatricesIndicesKind),r("WEIGHTS_0",b.VertexBuffer.MatricesWeightsKind),r("COLOR_0",b.VertexBuffer.ColorKind,(function(e){"VEC4"===e.type&&(a.hasVertexAlpha=!0)})),Promise.all(l).then((function(){return u}))},p.prototype._createMorphTargets=function(e,t,n,r,o){if(r.targets){if(null==t._numMorphTargets)t._numMorphTargets=r.targets.length;else if(r.targets.length!==t._numMorphTargets)throw new Error(e+": Primitives do not have the same number of targets");o.morphTargetManager=new b.MorphTargetManager;for(var a=0;a<r.targets.length;a++){var i=t.weights?t.weights[a]:n.weights?n.weights[a]:0;o.morphTargetManager.addTarget(new b.MorphTarget("morphTarget"+a,i))}}},p.prototype._loadMorphTargetsAsync=function(e,t,n,r){if(!t.targets)return Promise.resolve();for(var o=new Array,a=n.morphTargetManager,i=0;i<a.numTargets;i++){var s=a.getTarget(i);o.push(this._loadMorphTargetVertexDataAsync(e+"/targets/"+i,r,t.targets[i],s))}return Promise.all(o).then((function(){}))},p.prototype._loadMorphTargetVertexDataAsync=function(a,i,s,t){var l=this,u=new Array,e=function(e,t,n){if(null!=s[e]){var r=i.getVertexBuffer(t);if(r){var o=v.Get(a+"/"+e,l.gltf.accessors,s[e]);u.push(l._loadFloatAccessorAsync("#/accessors/"+o.index,o).then((function(e){n(r,e)})))}}};return e("POSITION",b.VertexBuffer.PositionKind,(function(e,n){e.forEach(n.length,(function(e,t){n[t]+=e})),t.setPositions(n)})),e("NORMAL",b.VertexBuffer.NormalKind,(function(e,n){e.forEach(n.length,(function(e,t){n[t]+=e})),t.setNormals(n)})),e("TANGENT",b.VertexBuffer.TangentKind,(function(e,n){var r=0;e.forEach(n.length/3*4,(function(e,t){(t+1)%4!=0&&(n[r++]+=e)})),t.setTangents(n)})),Promise.all(u).then((function(){}))},p._LoadTransform=function(e,t){var n=b.Vector3.Zero(),r=b.Quaternion.Identity(),o=b.Vector3.One();e.matrix?b.Matrix.FromArray(e.matrix).decompose(o,r,n):(e.translation&&(n=b.Vector3.FromArray(e.translation)),e.rotation&&(r=b.Quaternion.FromArray(e.rotation)),e.scale&&(o=b.Vector3.FromArray(e.scale)));t.position=n,t.rotationQuaternion=r,t.scaling=o},p.prototype._loadSkinAsync=function(e,n,t){var r=this,o=function(t){r._forEachPrimitive(n,(function(e){e.skeleton=t})),n._babylonMesh.position=b.Vector3.Zero(),n._babylonMesh.rotationQuaternion=b.Quaternion.Identity(),n._babylonMesh.scaling=b.Vector3.One()};if(t._promise)return t._promise.then((function(){o(t._babylonSkeleton)}));var a="skeleton"+t.index,i=new b.Skeleton(t.name||a,a,this.babylonScene);return t._babylonSkeleton=i,this._loadBones(e,t),o(i),t._promise=this._loadSkinInverseBindMatricesDataAsync(e,t).then((function(e){r._updateBoneMatrices(i,e)}))},p.prototype._loadBones=function(e,t){for(var n={},r=0,o=t.joints;r<o.length;r++){var a=o[r],i=v.Get(e+"/joints/"+a,this.gltf.nodes,a);this._loadBone(i,t,n)}},p.prototype._loadBone=function(e,t,n){var r=n[e.index];if(r)return r;var o=null;e.parent&&e.parent._babylonMesh!==this._rootBabylonMesh&&(o=this._loadBone(e.parent,t,n));var a=t.joints.indexOf(e.index);return r=new b.Bone(e.name||"joint"+e.index,t._babylonSkeleton,o,this._getNodeMatrix(e),null,null,a),n[e.index]=r,e._babylonBones=e._babylonBones||[],e._babylonBones.push(r),r},p.prototype._loadSkinInverseBindMatricesDataAsync=function(e,t){if(null==t.inverseBindMatrices)return Promise.resolve(null);var n=v.Get(e+"/inverseBindMatrices",this.gltf.accessors,t.inverseBindMatrices);return this._loadFloatAccessorAsync("#/accessors/"+n.index,n)},p.prototype._updateBoneMatrices=function(e,t){for(var n=0,r=e.bones;n<r.length;n++){var o=r[n],a=b.Matrix.Identity(),i=o._index;t&&-1!==i&&(b.Matrix.FromArrayToRef(t,16*i,a),a.invertToRef(a));var s=o.getParent();s&&a.multiplyToRef(s.getInvertedAbsoluteTransform(),a),o.updateMatrix(a,!1,!1),o._updateDifferenceMatrix(void 0,!1)}},p.prototype._getNodeMatrix=function(e){return e.matrix?b.Matrix.FromArray(e.matrix):b.Matrix.Compose(e.scale?b.Vector3.FromArray(e.scale):b.Vector3.One(),e.rotation?b.Quaternion.FromArray(e.rotation):b.Quaternion.Identity(),e.translation?b.Vector3.FromArray(e.translation):b.Vector3.Zero())},p.prototype.loadCameraAsync=function(e,t,n){void 0===n&&(n=function(){});var r=this._extensionsLoadCameraAsync(e,t,n);if(r)return r;var o=new Array;this.logOpen(e+" "+(t.name||""));var a=new b.FreeCamera(t.name||"camera"+t.index,b.Vector3.Zero(),this.babylonScene,!1);switch(a.rotation=new b.Vector3(0,Math.PI,0),t.type){case"perspective":var i=t.perspective;if(!i)throw new Error(e+": Camera perspective properties are missing");a.fov=i.yfov,a.minZ=i.znear,a.maxZ=i.zfar||Number.MAX_VALUE;break;case"orthographic":if(!t.orthographic)throw new Error(e+": Camera orthographic properties are missing");a.mode=b.Camera.ORTHOGRAPHIC_CAMERA,a.orthoLeft=-t.orthographic.xmag,a.orthoRight=t.orthographic.xmag,a.orthoBottom=-t.orthographic.ymag,a.orthoTop=t.orthographic.ymag,a.minZ=t.orthographic.znear,a.maxZ=t.orthographic.zfar;break;default:throw new Error(e+": Invalid camera type ("+t.type+")")}return n(a),this._parent.onCameraLoadedObservable.notifyObservers(a),Promise.all(o).then((function(){return a}))},p.prototype._loadAnimationsAsync=function(){var e=this.gltf.animations;if(!e)return Promise.resolve();for(var t=new Array,n=0;n<e.length;n++){var r=e[n];t.push(this.loadAnimationAsync("#/animations/"+r.index,r))}return Promise.all(t).then((function(){}))},p.prototype.loadAnimationAsync=function(e,t){var n=this._extensionsLoadAnimationAsync(e,t);if(n)return n;var r=new b.AnimationGroup(t.name||"animation"+t.index,this.babylonScene);t._babylonAnimationGroup=r;var o=new Array;v.Assign(t.channels),v.Assign(t.samplers);for(var a=0,i=t.channels;a<i.length;a++){var s=i[a];o.push(this._loadAnimationChannelAsync(e+"/channels/"+s.index,e,t,s,r))}return Promise.all(o).then((function(){return r.normalize(0),r}))},p.prototype._loadAnimationChannelAsync=function(m,e,t,_,y){var A=this,g=v.Get(m+"/target/node",this.gltf.nodes,_.target.node);if("weights"===_.target.path&&!g._numMorphTargets||"weights"!==_.target.path&&!g._babylonMesh)return Promise.resolve();if(null!=g.skin&&"weights"!==_.target.path)return Promise.resolve();var n=v.Get(m+"/sampler",t.samplers,_.sampler);return this._loadAnimationSamplerAsync(e+"/samplers/"+_.sampler,n).then((function(n){var t,a;switch(_.target.path){case"translation":t="position",a=b.Animation.ANIMATIONTYPE_VECTOR3;break;case"rotation":t="rotationQuaternion",a=b.Animation.ANIMATIONTYPE_QUATERNION;break;case"scale":t="scaling",a=b.Animation.ANIMATIONTYPE_VECTOR3;break;case"weights":t="influence",a=b.Animation.ANIMATIONTYPE_FLOAT;break;default:throw new Error(m+"/target/path: Invalid value ("+_.target.path+")")}var r,e,o=0;switch(t){case"position":r=function(){var e=b.Vector3.FromArray(n.output,o);return o+=3,e};break;case"rotationQuaternion":r=function(){var e=b.Quaternion.FromArray(n.output,o);return o+=4,e};break;case"scaling":r=function(){var e=b.Vector3.FromArray(n.output,o);return o+=3,e};break;case"influence":r=function(){for(var e=new Array(g._numMorphTargets),t=0;t<g._numMorphTargets;t++)e[t]=n.output[o++];return e}}switch(n.interpolation){case"STEP":e=function(e){return{frame:n.input[e],value:r(),interpolation:b.AnimationKeyInterpolation.STEP}};break;case"LINEAR":e=function(e){return{frame:n.input[e],value:r()}};break;case"CUBICSPLINE":e=function(e){return{frame:n.input[e],inTangent:r(),value:r(),outTangent:r()}}}for(var i=new Array(n.input.length),s=0;s<n.input.length;s++)i[s]=e(s);if("influence"===t)for(var l=function(r){var e=y.name+"_channel"+y.targetedAnimations.length,o=new b.Animation(e,t,1,a);o.setKeys(i.map((function(e){return{frame:e.frame,inTangent:e.inTangent?e.inTangent[r]:void 0,value:e.value[r],outTangent:e.outTangent?e.outTangent[r]:void 0}}))),A._forEachPrimitive(g,(function(e){var t=e.morphTargetManager.getTarget(r),n=o.clone();t.animations.push(n),y.addTargetedAnimation(n,t)}))},u=0;u<g._numMorphTargets;u++)l(u);else{var c=y.name+"_channel"+y.targetedAnimations.length,d=new b.Animation(c,t,1,a);if(d.setKeys(i),g._babylonBones){for(var f=[g._babylonMesh].concat(g._babylonBones),h=0,p=f;h<p.length;h++){p[h].animations.push(d)}y.addTargetedAnimation(d,f)}else g._babylonMesh.animations.push(d),y.addTargetedAnimation(d,g._babylonMesh)}}))},p.prototype._loadAnimationSamplerAsync=function(e,t){if(t._data)return t._data;var r=t.interpolation||"LINEAR";switch(r){case"STEP":case"LINEAR":case"CUBICSPLINE":break;default:throw new Error(e+"/interpolation: Invalid value ("+t.interpolation+")")}var n=v.Get(e+"/input",this.gltf.accessors,t.input),o=v.Get(e+"/output",this.gltf.accessors,t.output);return t._data=Promise.all([this._loadFloatAccessorAsync("#/accessors/"+n.index,n),this._loadFloatAccessorAsync("#/accessors/"+o.index,o)]).then((function(e){var t=e[0],n=e[1];return{input:t,interpolation:r,output:n}})),t._data},p.prototype._loadBufferAsync=function(e,t){if(t._data)return t._data;if(!t.uri)throw new Error(e+"/uri: Value is missing");return t._data=this.loadUriAsync(e+"/uri",t.uri),t._data},p.prototype.loadBufferViewAsync=function(t,n){if(n._data)return n._data;var e=v.Get(t+"/buffer",this.gltf.buffers,n.buffer);return n._data=this._loadBufferAsync("#/buffers/"+e.index,e).then((function(e){try{return new Uint8Array(e.buffer,e.byteOffset+(n.byteOffset||0),n.byteLength)}catch(e){throw new Error(t+": "+e.message)}})),n._data},p.prototype._loadIndicesAccessorAsync=function(t,n){if("SCALAR"!==n.type)throw new Error(t+"/type: Invalid value "+n.type);if(5121!==n.componentType&&5123!==n.componentType&&5125!==n.componentType)throw new Error(t+"/componentType: Invalid value "+n.componentType);if(n._data)return n._data;var e=v.Get(t+"/bufferView",this.gltf.bufferViews,n.bufferView);return n._data=this.loadBufferViewAsync("#/bufferViews/"+e.index,e).then((function(e){return p._GetTypedArray(t,n.componentType,e,n.byteOffset,n.count)})),n._data},p.prototype._loadFloatAccessorAsync=function(c,d){var n=this;if(5126!==d.componentType)throw new Error("Invalid component type "+d.componentType);if(d._data)return d._data;var f=p._GetNumComponents(c,d.type),t=f*d.count;if(null==d.bufferView)d._data=Promise.resolve(new Float32Array(t));else{var e=v.Get(c+"/bufferView",this.gltf.bufferViews,d.bufferView);d._data=this.loadBufferViewAsync("#/bufferViews/"+e.index,e).then((function(e){return p._GetTypedArray(c,d.componentType,e,d.byteOffset,t)}))}if(d.sparse){var h=d.sparse;d._data=d._data.then((function(u){var e=v.Get(c+"/sparse/indices/bufferView",n.gltf.bufferViews,h.indices.bufferView),t=v.Get(c+"/sparse/values/bufferView",n.gltf.bufferViews,h.values.bufferView);return Promise.all([n.loadBufferViewAsync("#/bufferViews/"+e.index,e),n.loadBufferViewAsync("#/bufferViews/"+t.index,t)]).then((function(e){for(var t=e[0],n=e[1],r=p._GetTypedArray(c+"/sparse/indices",h.indices.componentType,t,h.indices.byteOffset,h.count),o=p._GetTypedArray(c+"/sparse/values",d.componentType,n,h.values.byteOffset,f*h.count),a=0,i=0;i<r.length;i++)for(var s=r[i]*f,l=0;l<f;l++)u[s++]=o[a++];return u}))}))}return d._data},p.prototype._loadVertexBufferViewAsync=function(e,t){var n=this;return e._babylonBuffer||(e._babylonBuffer=this.loadBufferViewAsync("#/bufferViews/"+e.index,e).then((function(e){return new b.Buffer(n.babylonScene.getEngine(),e,!1)}))),e._babylonBuffer},p.prototype._loadVertexAccessorAsync=function(n,r,o){var a=this;if(r._babylonVertexBuffer)return r._babylonVertexBuffer;if(r.sparse)r._babylonVertexBuffer=this._loadFloatAccessorAsync("#/accessors/"+r.index,r).then((function(e){return new b.VertexBuffer(a.babylonScene.getEngine(),e,o,!1)}));else if(r.byteOffset&&r.byteOffset%b.VertexBuffer.GetTypeByteLength(r.componentType)!=0)b.Tools.Warn("Accessor byte offset is not a multiple of component type byte length"),r._babylonVertexBuffer=this._loadFloatAccessorAsync("#/accessors/"+r.index,r).then((function(e){return new b.VertexBuffer(a.babylonScene.getEngine(),e,o,!1)}));else{var i=v.Get(n+"/bufferView",this.gltf.bufferViews,r.bufferView);r._babylonVertexBuffer=this._loadVertexBufferViewAsync(i,o).then((function(e){var t=p._GetNumComponents(n,r.type);return new b.VertexBuffer(a.babylonScene.getEngine(),e,o,!1,!1,i.byteStride,!1,r.byteOffset,t,r.componentType,r.normalized,!0)}))}return r._babylonVertexBuffer},p.prototype._loadMaterialMetallicRoughnessPropertiesAsync=function(e,t,n){if(!(n instanceof b.PBRMaterial))throw new Error(e+": Material type not supported");var r=new Array;return t&&(t.baseColorFactor?(n.albedoColor=b.Color3.FromArray(t.baseColorFactor),n.alpha=t.baseColorFactor[3]):n.albedoColor=b.Color3.White(),n.metallic=null==t.metallicFactor?1:t.metallicFactor,n.roughness=null==t.roughnessFactor?1:t.roughnessFactor,t.baseColorTexture&&r.push(this.loadTextureInfoAsync(e+"/baseColorTexture",t.baseColorTexture,(function(e){n.albedoTexture=e}))),t.metallicRoughnessTexture&&(r.push(this.loadTextureInfoAsync(e+"/metallicRoughnessTexture",t.metallicRoughnessTexture,(function(e){n.metallicTexture=e}))),n.useMetallnessFromMetallicTextureBlue=!0,n.useRoughnessFromMetallicTextureGreen=!0,n.useRoughnessFromMetallicTextureAlpha=!1)),Promise.all(r).then((function(){}))},p.prototype._loadMaterialAsync=function(e,t,n,r,o){void 0===o&&(o=function(){});var a=this._extensionsLoadMaterialAsync(e,t,n,r,o);if(a)return a;t._babylonData=t._babylonData||{};var i=t._babylonData[r];if(!i){this.logOpen(e+" "+(t.name||""));var s=this.createMaterial(e,t,r);i={material:s,meshes:[],promise:this.loadMaterialPropertiesAsync(e,t,s)},t._babylonData[r]=i,this._parent.onMaterialLoadedObservable.notifyObservers(s),this.logClose()}return i.meshes.push(n),n.onDisposeObservable.addOnce((function(){var e=i.meshes.indexOf(n);-1!==e&&i.meshes.splice(e,1)})),o(i.material),i.promise.then((function(){return i.material}))},p.prototype._createDefaultMaterial=function(e,t){var n=new b.PBRMaterial(e,this.babylonScene);return n.sideOrientation=this.babylonScene.useRightHandedSystem?b.Material.CounterClockWiseSideOrientation:b.Material.ClockWiseSideOrientation,n.fillMode=t,n.enableSpecularAntiAliasing=!0,n.useRadianceOverAlpha=!this._parent.transparencyAsCoverage,n.useSpecularOverAlpha=!this._parent.transparencyAsCoverage,n.transparencyMode=b.PBRMaterial.PBRMATERIAL_OPAQUE,n.metallic=1,n.roughness=1,n},p.prototype.createMaterial=function(e,t,n){var r=this._extensionsCreateMaterial(e,t,n);if(r)return r;var o=t.name||"material"+t.index;return this._createDefaultMaterial(o,n)},p.prototype.loadMaterialPropertiesAsync=function(e,t,n){var r=this._extensionsLoadMaterialPropertiesAsync(e,t,n);if(r)return r;var o=new Array;return o.push(this.loadMaterialBasePropertiesAsync(e,t,n)),t.pbrMetallicRoughness&&o.push(this._loadMaterialMetallicRoughnessPropertiesAsync(e+"/pbrMetallicRoughness",t.pbrMetallicRoughness,n)),this.loadMaterialAlphaProperties(e,t,n),Promise.all(o).then((function(){}))},p.prototype.loadMaterialBasePropertiesAsync=function(e,t,n){if(!(n instanceof b.PBRMaterial))throw new Error(e+": Material type not supported");var r=new Array;return n.emissiveColor=t.emissiveFactor?b.Color3.FromArray(t.emissiveFactor):new b.Color3(0,0,0),t.doubleSided&&(n.backFaceCulling=!1,n.twoSidedLighting=!0),t.normalTexture&&(r.push(this.loadTextureInfoAsync(e+"/normalTexture",t.normalTexture,(function(e){n.bumpTexture=e}))),n.invertNormalMapX=!this.babylonScene.useRightHandedSystem,n.invertNormalMapY=this.babylonScene.useRightHandedSystem,null!=t.normalTexture.scale&&(n.bumpTexture.level=t.normalTexture.scale)),t.occlusionTexture&&(r.push(this.loadTextureInfoAsync(e+"/occlusionTexture",t.occlusionTexture,(function(e){n.ambientTexture=e}))),n.useAmbientInGrayScale=!0,null!=t.occlusionTexture.strength&&(n.ambientTextureStrength=t.occlusionTexture.strength)),t.emissiveTexture&&r.push(this.loadTextureInfoAsync(e+"/emissiveTexture",t.emissiveTexture,(function(e){n.emissiveTexture=e}))),Promise.all(r).then((function(){}))},p.prototype.loadMaterialAlphaProperties=function(e,t,n){if(!(n instanceof b.PBRMaterial))throw new Error(e+": Material type not supported");switch(t.alphaMode||"OPAQUE"){case"OPAQUE":n.transparencyMode=b.PBRMaterial.PBRMATERIAL_OPAQUE;break;case"MASK":n.transparencyMode=b.PBRMaterial.PBRMATERIAL_ALPHATEST,n.alphaCutOff=null==t.alphaCutoff?.5:t.alphaCutoff,n.albedoTexture&&(n.albedoTexture.hasAlpha=!0);break;case"BLEND":n.transparencyMode=b.PBRMaterial.PBRMATERIAL_ALPHABLEND,n.albedoTexture&&(n.albedoTexture.hasAlpha=!0,n.useAlphaFromAlbedoTexture=!0);break;default:throw new Error(e+"/alphaMode: Invalid value ("+t.alphaMode+")")}},p.prototype.loadTextureInfoAsync=function(e,t,n){void 0===n&&(n=function(){});var r=this._extensionsLoadTextureInfoAsync(e,t,n);if(r)return r;this.logOpen(""+e);var o=v.Get(e+"/index",this.gltf.textures,t.index),a=this._loadTextureAsync("#/textures/"+t.index,o,(function(e){e.coordinatesIndex=t.texCoord||0,n(e)}));return this.logClose(),a},p.prototype._loadTextureAsync=function(n,e,t){var r=this;void 0===t&&(t=function(){});var o=new Array;this.logOpen(n+" "+(e.name||""));var a=null==e.sampler?p._DefaultSampler:v.Get(n+"/sampler",this.gltf.samplers,e.sampler),i=this._loadSampler("#/samplers/"+a.index,a),s=new b.Deferred,l=new b.Texture(null,this.babylonScene,i.noMipMaps,!1,i.samplingMode,function(){r._disposed||s.resolve()},function(e,t){r._disposed||s.reject(new Error(n+": "+(t&&t.message?t.message:e||"Failed to load texture")))});o.push(s.promise),l.name=e.name||"texture"+e.index,l.wrapU=i.wrapU,l.wrapV=i.wrapV;var u=v.Get(n+"/source",this.gltf.images,e.source);return o.push(this.loadImageAsync("#/images/"+u.index,u).then((function(e){var t=u.uri||r._fileName+"#image"+u.index,n="data:"+r._uniqueRootUrl+t;l.updateURL(n,new Blob([e],{type:u.mimeType}))}))),t(l),this._parent.onTextureLoadedObservable.notifyObservers(l),this.logClose(),Promise.all(o).then((function(){return l}))},p.prototype._loadSampler=function(e,t){return t._data||(t._data={noMipMaps:9728===t.minFilter||9729===t.minFilter,samplingMode:p._GetTextureSamplingMode(e,t),wrapU:p._GetTextureWrapMode(e+"/wrapS",t.wrapS),wrapV:p._GetTextureWrapMode(e+"/wrapT",t.wrapT)}),t._data},p.prototype.loadImageAsync=function(e,t){if(!t._data){if(this.logOpen(e+" "+(t.name||"")),t.uri)t._data=this.loadUriAsync(e+"/uri",t.uri);else{var n=v.Get(e+"/bufferView",this.gltf.bufferViews,t.bufferView);t._data=this.loadBufferViewAsync("#/bufferViews/"+n.index,n)}this.logClose()}return t._data},p.prototype.loadUriAsync=function(o,a){var i=this,e=this._extensionsLoadUriAsync(o,a);if(e)return e;if(!p._ValidateUri(a))throw new Error(o+": '"+a+"' is invalid");if(b.Tools.IsBase64(a)){var t=new Uint8Array(b.Tools.DecodeBase64(a));return this.log("Decoded "+a.substr(0,64)+"... ("+t.length+" bytes)"),Promise.resolve(t)}return this.log("Loading "+a),this._parent.preprocessUrlAsync(this._rootUrl+a).then((function(e){return new Promise(function(n,r){if(!i._disposed){var t=b.Tools.LoadFile(e,(function(e){if(!i._disposed){var t=new Uint8Array(e);i.log("Loaded "+a+" ("+t.length+" bytes)"),n(t)}}),(function(e){if(!i._disposed&&(t&&(t._lengthComputable=e.lengthComputable,t._loaded=e.loaded,t._total=e.total),i._state===b.GLTFLoaderState.LOADING))try{i._onProgress()}catch(e){r(e)}}),i.babylonScene.database,!0,(function(e,t){i._disposed||r(new b.LoadFileError(o+": Failed to load '"+a+"'"+(e?": "+e.status+" "+e.statusText:""),e))}));i._requests.push(t)}})}))},p.prototype._onProgress=function(){if(this._progressCallback){for(var e=!0,t=0,n=0,r=0,o=this._requests;r<o.length;r++){var a=o[r];if(void 0===a._lengthComputable||void 0===a._loaded||void 0===a._total)return;e=e&&a._lengthComputable,t+=a._loaded,n+=a._total}this._progressCallback(new b.SceneLoaderProgressEvent(e,t,e?n:0))}},p._GetTextureWrapMode=function(e,t){switch(t=null==t?10497:t){case 33071:return b.Texture.CLAMP_ADDRESSMODE;case 33648:return b.Texture.MIRROR_ADDRESSMODE;case 10497:return b.Texture.WRAP_ADDRESSMODE;default:return b.Tools.Warn(e+": Invalid value ("+t+")"),b.Texture.WRAP_ADDRESSMODE}},p._GetTextureSamplingMode=function(e,t){var n=null==t.magFilter?9729:t.magFilter,r=null==t.minFilter?9987:t.minFilter;if(9729===n)switch(r){case 9728:return b.Texture.LINEAR_NEAREST;case 9729:return b.Texture.LINEAR_LINEAR;case 9984:return b.Texture.LINEAR_NEAREST_MIPNEAREST;case 9985:return b.Texture.LINEAR_LINEAR_MIPNEAREST;case 9986:return b.Texture.LINEAR_NEAREST_MIPLINEAR;case 9987:return b.Texture.LINEAR_LINEAR_MIPLINEAR;default:return b.Tools.Warn(e+"/minFilter: Invalid value ("+r+")"),b.Texture.LINEAR_LINEAR_MIPLINEAR}else switch(9728!==n&&b.Tools.Warn(e+"/magFilter: Invalid value ("+n+")"),r){case 9728:return b.Texture.NEAREST_NEAREST;case 9729:return b.Texture.NEAREST_LINEAR;case 9984:return b.Texture.NEAREST_NEAREST_MIPNEAREST;case 9985:return b.Texture.NEAREST_LINEAR_MIPNEAREST;case 9986:return b.Texture.NEAREST_NEAREST_MIPLINEAR;case 9987:return b.Texture.NEAREST_LINEAR_MIPLINEAR;default:return b.Tools.Warn(e+"/minFilter: Invalid value ("+r+")"),b.Texture.NEAREST_NEAREST_MIPNEAREST}},p._GetTypedArray=function(t,e,n,r,o){var a=n.buffer;r=n.byteOffset+(r||0);try{switch(e){case 5120:return new Int8Array(a,r,o);case 5121:return new Uint8Array(a,r,o);case 5122:return new Int16Array(a,r,o);case 5123:return new Uint16Array(a,r,o);case 5125:return new Uint32Array(a,r,o);case 5126:return new Float32Array(a,r,o);default:throw new Error("Invalid component type "+e)}}catch(e){throw new Error(t+": "+e)}},p._GetNumComponents=function(e,t){switch(t){case"SCALAR":return 1;case"VEC2":return 2;case"VEC3":return 3;case"VEC4":case"MAT2":return 4;case"MAT3":return 9;case"MAT4":return 16}throw new Error(e+": Invalid type ("+t+")")},p._ValidateUri=function(e){return b.Tools.IsBase64(e)||-1===e.indexOf("..")},p._GetDrawMode=function(e,t){switch(null==t&&(t=4),t){case 0:return b.Material.PointListDrawMode;case 1:return b.Material.LineListDrawMode;case 2:return b.Material.LineLoopDrawMode;case 3:return b.Material.LineStripDrawMode;case 4:return b.Material.TriangleFillMode;case 5:return b.Material.TriangleStripDrawMode;case 6:return b.Material.TriangleFanDrawMode}throw new Error(e+": Invalid mesh primitive mode ("+t+")")},p.prototype._compileMaterialsAsync=function(){var e=this;this._parent._startPerformanceCounter("Compile materials");var t=new Array;if(this.gltf.materials)for(var n=0,r=this.gltf.materials;n<r.length;n++){var o=r[n];if(o._babylonData)for(var a in o._babylonData)for(var i=o._babylonData[a],s=0,l=i.meshes;s<l.length;s++){var u=l[s];u.computeWorldMatrix(!0);var c=i.material;t.push(c.forceCompilationAsync(u)),this._parent.useClipPlane&&t.push(c.forceCompilationAsync(u,{clipPlane:!0}))}}return Promise.all(t).then((function(){e._parent._endPerformanceCounter("Compile materials")}))},p.prototype._compileShadowGeneratorsAsync=function(){var e=this;this._parent._startPerformanceCounter("Compile shadow generators");for(var t=new Array,n=0,r=this.babylonScene.lights;n<r.length;n++){var o=r[n].getShadowGenerator();o&&t.push(o.forceCompilationAsync())}return Promise.all(t).then((function(){e._parent._endPerformanceCounter("Compile shadow generators")}))},p.prototype._forEachExtensions=function(e){for(var t=0,n=p._ExtensionNames;t<n.length;t++){var r=n[t],o=this._extensions[r];o.enabled&&e(o)}},p.prototype._applyExtensions=function(e,t){for(var n=0,r=p._ExtensionNames;n<r.length;n++){var o=r[n],a=this._extensions[o];if(a.enabled){var i=e;i._activeLoaderExtensions=i._activeLoaderExtensions||{};var s=i._activeLoaderExtensions;if(!s[o]){s[o]=!0;try{var l=t(a);if(l)return l}finally{delete s[o]}}}}return null},p.prototype._extensionsOnLoading=function(){this._forEachExtensions((function(e){return e.onLoading&&e.onLoading()}))},p.prototype._extensionsOnReady=function(){this._forEachExtensions((function(e){return e.onReady&&e.onReady()}))},p.prototype._extensionsLoadSceneAsync=function(t,n){return this._applyExtensions(n,(function(e){return e.loadSceneAsync&&e.loadSceneAsync(t,n)}))},p.prototype._extensionsLoadNodeAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadNodeAsync&&e.loadNodeAsync(t,n,r)}))},p.prototype._extensionsLoadCameraAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadCameraAsync&&e.loadCameraAsync(t,n,r)}))},p.prototype._extensionsLoadVertexDataAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e._loadVertexDataAsync&&e._loadVertexDataAsync(t,n,r)}))},p.prototype._extensionsLoadMaterialAsync=function(t,n,r,o,a){return this._applyExtensions(n,(function(e){return e._loadMaterialAsync&&e._loadMaterialAsync(t,n,r,o,a)}))},p.prototype._extensionsCreateMaterial=function(t,n,r){return this._applyExtensions({},(function(e){return e.createMaterial&&e.createMaterial(t,n,r)}))},p.prototype._extensionsLoadMaterialPropertiesAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadMaterialPropertiesAsync&&e.loadMaterialPropertiesAsync(t,n,r)}))},p.prototype._extensionsLoadTextureInfoAsync=function(t,n,r){return this._applyExtensions(n,(function(e){return e.loadTextureInfoAsync&&e.loadTextureInfoAsync(t,n,r)}))},p.prototype._extensionsLoadAnimationAsync=function(t,n){return this._applyExtensions(n,(function(e){return e.loadAnimationAsync&&e.loadAnimationAsync(t,n)}))},p.prototype._extensionsLoadUriAsync=function(t,n){return this._applyExtensions({},(function(e){return e._loadUriAsync&&e._loadUriAsync(t,n)}))},p.LoadExtensionAsync=function(e,t,n,r){if(!t.extensions)return null;var o=t.extensions[n];return o?r(e+"/extensions/"+n,o):null},p.LoadExtraAsync=function(e,t,n,r){if(!t.extras)return null;var o=t.extras[n];return o?r(e+"/extras/"+n,o):null},p.prototype.logOpen=function(e){this._parent._logOpen(e)},p.prototype.logClose=function(){this._parent._logClose()},p.prototype.log=function(e){this._parent._log(e)},p.prototype.startPerformanceCounter=function(e){this._parent._startPerformanceCounter(e)},p.prototype.endPerformanceCounter=function(e){this._parent._endPerformanceCounter(e)},p._DefaultSampler={index:-1},p._ExtensionNames=new Array,p._ExtensionFactories={},p})();e.GLTFLoader=t,b.GLTFFileLoader._CreateGLTFLoaderV2=function(e){return new t(e)}})(b.GLTF2||(b.GLTF2={}))})(BABYLON||(BABYLON={})),(function(l){var d,e,t,n,r;d=l.GLTF2||(l.GLTF2={}),e=d.Loader||(d.Loader={}),t=e.Extensions||(e.Extensions={}),n="MSFT_lod",r=(function(){function e(e){this.name=n,this.enabled=!0,this.maxLODsToLoad=Number.MAX_VALUE,this.onNodeLODsLoadedObservable=new l.Observable,this.onMaterialLODsLoadedObservable=new l.Observable,this._nodeIndexLOD=null,this._nodeSignalLODs=new Array,this._nodePromiseLODs=new Array,this._materialIndexLOD=null,this._materialSignalLODs=new Array,this._materialPromiseLODs=new Array,this._loader=e}return e.prototype.dispose=function(){delete this._loader,this._nodeIndexLOD=null,this._nodeSignalLODs.length=0,this._nodePromiseLODs.length=0,this._materialIndexLOD=null,this._materialSignalLODs.length=0,this._materialPromiseLODs.length=0,this.onMaterialLODsLoadedObservable.clear(),this.onNodeLODsLoadedObservable.clear()},e.prototype.onReady=function(){for(var n=this,e=function(e){var t=Promise.all(r._nodePromiseLODs[e]).then((function(){0!==e&&n._loader.endPerformanceCounter("Node LOD "+e),n._loader.log("Loaded node LOD "+e),n.onNodeLODsLoadedObservable.notifyObservers(e),e!==n._nodePromiseLODs.length-1&&(n._loader.startPerformanceCounter("Node LOD "+(e+1)),n._nodeSignalLODs[e]&&n._nodeSignalLODs[e].resolve())}));r._loader._completePromises.push(t)},r=this,t=0;t<this._nodePromiseLODs.length;t++)e(t);var o=function(e){var t=Promise.all(a._materialPromiseLODs[e]).then((function(){0!==e&&n._loader.endPerformanceCounter("Material LOD "+e),n._loader.log("Loaded material LOD "+e),n.onMaterialLODsLoadedObservable.notifyObservers(e),e!==n._materialPromiseLODs.length-1&&(n._loader.startPerformanceCounter("Material LOD "+(e+1)),n._materialSignalLODs[e]&&n._materialSignalLODs[e].resolve())}));a._loader._completePromises.push(t)},a=this;for(t=0;t<this._materialPromiseLODs.length;t++)o(t)},e.prototype.loadNodeAsync=function(e,i,t){var s=this;return d.GLTFLoader.LoadExtensionAsync(e,i,this.name,(function(e,t){var r,o=s._getLODs(e,i,s._loader.gltf.nodes,t.ids);s._loader.logOpen(""+e);for(var n=function(n){var e=o[n];0!==n&&(s._nodeIndexLOD=n,s._nodeSignalLODs[n]=s._nodeSignalLODs[n]||new l.Deferred);var t=s._loader.loadNodeAsync("#/nodes/"+e.index,e).then((function(e){if(0!==n){var t=o[n-1];t._babylonMesh&&(t._babylonMesh.dispose(),delete t._babylonMesh,s._disposeUnusedMaterials())}return e}));0===n?r=t:s._nodeIndexLOD=null,s._nodePromiseLODs[n]=s._nodePromiseLODs[n]||[],s._nodePromiseLODs[n].push(t)},a=0;a<o.length;a++)n(a);return s._loader.logClose(),r}))},e.prototype._loadMaterialAsync=function(e,i,s,l,u){var c=this;return this._nodeIndexLOD?null:d.GLTFLoader.LoadExtensionAsync(e,i,this.name,(function(e,t){var r,o=c._getLODs(e,i,c._loader.gltf.materials,t.ids);c._loader.logOpen(""+e);for(var n=function(n){var e=o[n];0!==n&&(c._materialIndexLOD=n);var t=c._loader._loadMaterialAsync("#/materials/"+e.index,e,s,l,(function(e){0===n&&u(e)})).then((function(e){if(0!==n){u(e);var t=o[n-1]._babylonData;t[l]&&(t[l].material.dispose(),delete t[l])}return e}));0===n?r=t:c._materialIndexLOD=null,c._materialPromiseLODs[n]=c._materialPromiseLODs[n]||[],c._materialPromiseLODs[n].push(t)},a=0;a<o.length;a++)n(a);return c._loader.logClose(),r}))},e.prototype._loadUriAsync=function(e,t){var n=this;if(null!==this._materialIndexLOD){this._loader.log("deferred");var r=this._materialIndexLOD-1;return this._materialSignalLODs[r]=this._materialSignalLODs[r]||new l.Deferred,this._materialSignalLODs[r].promise.then((function(){return n._loader.loadUriAsync(e,t)}))}return null!==this._nodeIndexLOD?(this._loader.log("deferred"),r=this._nodeIndexLOD-1,this._nodeSignalLODs[r]=this._nodeSignalLODs[r]||new l.Deferred,this._nodeSignalLODs[this._nodeIndexLOD-1].promise.then((function(){return n._loader.loadUriAsync(e,t)}))):null},e.prototype._getLODs=function(e,t,n,r){if(this.maxLODsToLoad<=0)throw new Error("maxLODsToLoad must be greater than zero");for(var o=new Array,a=r.length-1;0<=a;a--)if(o.push(d.ArrayItem.Get(e+"/ids/"+r[a],n,r[a])),o.length===this.maxLODsToLoad)return o;return o.push(t),o},e.prototype._disposeUnusedMaterials=function(){var e=this._loader.gltf.materials;if(e)for(var t=0,n=e;t<n.length;t++){var r=n[t];if(r._babylonData)for(var o in r._babylonData){var a=r._babylonData[o];0===a.meshes.length&&(a.material.dispose(!1,!0),delete r._babylonData[o])}}},e})(),t.MSFT_lod=r,d.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(s){var t,e,n,r,o;t=s.GLTF2||(s.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="MSFT_minecraftMesh",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(r,o,a){var i=this;return t.GLTFLoader.LoadExtraAsync(r,o,this.name,(function(e,t){if(t){if(!(a instanceof s.PBRMaterial))throw new Error(e+": Material type not supported");var n=i._loader.loadMaterialPropertiesAsync(r,o,a);return a.needAlphaBlending()&&(a.forceDepthWrite=!0,a.separateCullingPass=!0),a.backFaceCulling=a.forceDepthWrite,a.twoSidedLighting=!0,n}return null}))},e})(),n.MSFT_minecraftMesh=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(s){var t,e,n,r,o;t=s.GLTF2||(s.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="MSFT_sRGBFactors",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(r,o,a){var i=this;return t.GLTFLoader.LoadExtraAsync(r,o,this.name,(function(e,t){if(t){if(!(a instanceof s.PBRMaterial))throw new Error(e+": Material type not supported");var n=i._loader.loadMaterialPropertiesAsync(r,o,a);return a.albedoTexture||a.albedoColor.toLinearSpaceToRef(a.albedoColor),a.reflectivityTexture||a.reflectivityColor.toLinearSpaceToRef(a.reflectivityColor),n}return null}))},e})(),n.MSFT_sRGBFactors=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(c){var d,e,t,n,r;d=c.GLTF2||(c.GLTF2={}),e=d.Loader||(d.Loader={}),t=e.Extensions||(e.Extensions={}),n="MSFT_audio_emitter",r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader,delete this._clips,delete this._emitters},e.prototype.onLoading=function(){var e=this._loader.gltf.extensions;if(e&&e[this.name]){var t=e[this.name];this._clips=t.clips,this._emitters=t.emitters,d.ArrayItem.Assign(this._clips),d.ArrayItem.Assign(this._emitters)}},e.prototype.loadSceneAsync=function(s,l){var u=this;return d.GLTFLoader.LoadExtensionAsync(s,l,this.name,(function(e,t){var n=new Array;n.push(u._loader.loadSceneAsync(s,l));for(var r=0,o=t.emitters;r<o.length;r++){var a=o[r],i=d.ArrayItem.Get(e+"/emitters",u._emitters,a);if(null!=i.refDistance||null!=i.maxDistance||null!=i.rolloffFactor||null!=i.distanceModel||null!=i.innerAngle||null!=i.outerAngle)throw new Error(e+": Direction or Distance properties are not allowed on emitters attached to a scene");n.push(u._loadEmitterAsync(e+"/emitters/"+i.index,i))}return Promise.all(n).then((function(){}))}))},e.prototype.loadNodeAsync=function(e,t,s){var l=this;return d.GLTFLoader.LoadExtensionAsync(e,t,this.name,(function(a,r){var i=new Array;return l._loader.loadNodeAsync(a,t,(function(o){for(var e=function(e){var r=d.ArrayItem.Get(a+"/emitters",l._emitters,e);i.push(l._loadEmitterAsync(a+"/emitters/"+r.index,r).then((function(){for(var e=0,t=r._babylonSounds;e<t.length;e++){var n=t[e];n.attachToMesh(o),null==r.innerAngle&&null==r.outerAngle||(n.setLocalDirectionToMesh(c.Vector3.Forward()),n.setDirectionalCone(2*c.Tools.ToDegrees(null==r.innerAngle?Math.PI:r.innerAngle),2*c.Tools.ToDegrees(null==r.outerAngle?Math.PI:r.outerAngle),0))}})))},t=0,n=r.emitters;t<n.length;t++)e(n[t]);s(o)})).then((function(e){return Promise.all(i).then((function(){return e}))}))}))},e.prototype.loadAnimationAsync=function(s,l){var u=this;return d.GLTFLoader.LoadExtensionAsync(s,l,this.name,(function(a,i){return u._loader.loadAnimationAsync(s,l).then((function(e){var t=new Array;d.ArrayItem.Assign(i.events);for(var n=0,r=i.events;n<r.length;n++){var o=r[n];t.push(u._loadAnimationEventAsync(a+"/events/"+o.index,s,l,o,e))}return Promise.all(t).then((function(){return e}))}))}))},e.prototype._loadClipAsync=function(e,t){if(t._objectURL)return t._objectURL;var n;if(t.uri)n=this._loader.loadUriAsync(e,t.uri);else{var r=d.ArrayItem.Get(e+"/bufferView",this._loader.gltf.bufferViews,t.bufferView);n=this._loader.loadBufferViewAsync("#/bufferViews/"+r.index,r)}return t._objectURL=n.then((function(e){return URL.createObjectURL(new Blob([e],{type:t.mimeType}))})),t._objectURL},e.prototype._loadEmitterAsync=function(e,r){var o=this;if(r._babylonSounds=r._babylonSounds||[],!r._babylonData){for(var a=new Array,i=r.name||"emitter"+r.index,s={loop:!1,autoplay:!1,volume:null==r.volume?1:r.volume},t=function(n){var e="#/extensions/"+l.name+"/clips",t=d.ArrayItem.Get(e,l._clips,r.clips[n].clip);a.push(l._loadClipAsync(e+"/"+r.clips[n].clip,t).then((function(e){var t=r._babylonSounds[n]=new c.Sound(i,e,o._loader.babylonScene,null,s);t.refDistance=r.refDistance||1,t.maxDistance=r.maxDistance||256,t.rolloffFactor=r.rolloffFactor||1,t.distanceModel=r.distanceModel||"exponential",t._positionInEmitterSpace=!0})))},l=this,n=0;n<r.clips.length;n++)t(n);var u=Promise.all(a).then((function(){var e=r.clips.map((function(e){return e.weight||1})),t=new c.WeightedSound(r.loop||!1,r._babylonSounds,e);r.innerAngle&&(t.directionalConeInnerAngle=2*c.Tools.ToDegrees(r.innerAngle)),r.outerAngle&&(t.directionalConeOuterAngle=2*c.Tools.ToDegrees(r.outerAngle)),r.volume&&(t.volume=r.volume),r._babylonData.sound=t}));r._babylonData={loaded:u}}return r._babylonData.loaded},e.prototype._getEventAction=function(e,n,t,r,o){switch(t){case"play":return function(e){var t=(o||0)+(e-r);n.play(t)};case"stop":return function(e){n.stop()};case"pause":return function(e){n.pause()};default:throw new Error(e+": Unsupported action "+t)}},e.prototype._loadAnimationEventAsync=function(n,e,t,r,o){var a=this;if(0==o.targetedAnimations.length)return Promise.resolve();var i=o.targetedAnimations[0],s=r.emitter,l=d.ArrayItem.Get("#/extensions/"+this.name+"/emitters",this._emitters,s);return this._loadEmitterAsync(n,l).then((function(){var e=l._babylonData.sound;if(e){var t=new c.AnimationEvent(r.time,a._getEventAction(n,e,r.action,r.time,r.startOffset));i.animation.addEvent(t),o.onAnimationGroupEndObservable.add((function(){e.stop()})),o.onAnimationGroupPauseObservable.add((function(){e.pause()}))}}))},e})(),t.MSFT_audio_emitter=r,d.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(u){var c,e,t,n,r;c=u.GLTF2||(u.GLTF2={}),e=c.Loader||(c.Loader={}),t=e.Extensions||(e.Extensions={}),n="KHR_draco_mesh_compression",r=(function(){function e(e){this.name=n,this.enabled=u.DracoCompression.DecoderAvailable,this._loader=e}return e.prototype.dispose=function(){this._dracoCompression&&(this._dracoCompression.dispose(),delete this._dracoCompression),delete this._loader},e.prototype._loadVertexDataAsync=function(a,i,s){var l=this;return c.GLTFLoader.LoadExtensionAsync(a,i,this.name,(function(e,r){if(null!=i.mode){if(5!==i.mode&&4!==i.mode)throw new Error(a+": Unsupported mode "+i.mode);if(5===i.mode)throw new Error(a+": Mode "+i.mode+" is not currently supported")}var o={},t=function(e,t){var n=r.attributes[e];null!=n&&(s._delayInfo=s._delayInfo||[],-1===s._delayInfo.indexOf(t)&&s._delayInfo.push(t),o[t]=n)};t("POSITION",u.VertexBuffer.PositionKind),t("NORMAL",u.VertexBuffer.NormalKind),t("TANGENT",u.VertexBuffer.TangentKind),t("TEXCOORD_0",u.VertexBuffer.UVKind),t("TEXCOORD_1",u.VertexBuffer.UV2Kind),t("JOINTS_0",u.VertexBuffer.MatricesIndicesKind),t("WEIGHTS_0",u.VertexBuffer.MatricesWeightsKind),t("COLOR_0",u.VertexBuffer.ColorKind);var n=c.ArrayItem.Get(e,l._loader.gltf.bufferViews,r.bufferView);return n._dracoBabylonGeometry||(n._dracoBabylonGeometry=l._loader.loadBufferViewAsync("#/bufferViews/"+n.index,n).then((function(e){return l._dracoCompression||(l._dracoCompression=new u.DracoCompression),l._dracoCompression.decodeMeshAsync(e,o).then((function(e){var t=new u.Geometry(s.name,l._loader.babylonScene);return e.applyToGeometry(t),t})).catch((function(e){throw new Error(a+": "+e.message)}))}))),n._dracoBabylonGeometry}))},e})(),t.KHR_draco_mesh_compression=r,c.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(a){var t,e,n,r,o;t=a.GLTF2||(a.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="KHR_materials_pbrSpecularGlossiness",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(r,o,a){var i=this;return t.GLTFLoader.LoadExtensionAsync(r,o,this.name,(function(e,t){var n=new Array;return n.push(i._loader.loadMaterialBasePropertiesAsync(r,o,a)),n.push(i._loadSpecularGlossinessPropertiesAsync(e,o,t,a)),i._loader.loadMaterialAlphaProperties(r,o,a),Promise.all(n).then((function(){}))}))},e.prototype._loadSpecularGlossinessPropertiesAsync=function(e,t,n,r){if(!(r instanceof a.PBRMaterial))throw new Error(e+": Material type not supported");var o=new Array;return r.metallic=null,r.roughness=null,n.diffuseFactor?(r.albedoColor=a.Color3.FromArray(n.diffuseFactor),r.alpha=n.diffuseFactor[3]):r.albedoColor=a.Color3.White(),r.reflectivityColor=n.specularFactor?a.Color3.FromArray(n.specularFactor):a.Color3.White(),r.microSurface=null==n.glossinessFactor?1:n.glossinessFactor,n.diffuseTexture&&o.push(this._loader.loadTextureInfoAsync(e+"/diffuseTexture",n.diffuseTexture,(function(e){return r.albedoTexture=e,Promise.resolve()}))),n.specularGlossinessTexture&&(o.push(this._loader.loadTextureInfoAsync(e+"/specularGlossinessTexture",n.specularGlossinessTexture,(function(e){return r.reflectivityTexture=e,Promise.resolve()}))),r.reflectivityTexture.hasAlpha=!0,r.useMicroSurfaceFromReflectivityMapAlpha=!0),Promise.all(o).then((function(){}))},e})(),n.KHR_materials_pbrSpecularGlossiness=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(a){var o,e,t,n,r;o=a.GLTF2||(a.GLTF2={}),e=o.Loader||(o.Loader={}),t=e.Extensions||(e.Extensions={}),n="KHR_materials_unlit",r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadMaterialPropertiesAsync=function(e,t,n){var r=this;return o.GLTFLoader.LoadExtensionAsync(e,t,this.name,(function(){return r._loadUnlitPropertiesAsync(e,t,n)}))},e.prototype._loadUnlitPropertiesAsync=function(e,t,n){if(!(n instanceof a.PBRMaterial))throw new Error(e+": Material type not supported");var r=new Array;n.unlit=!0;var o=t.pbrMetallicRoughness;return o&&(o.baseColorFactor?(n.albedoColor=a.Color3.FromArray(o.baseColorFactor),n.alpha=o.baseColorFactor[3]):n.albedoColor=a.Color3.White(),o.baseColorTexture&&r.push(this._loader.loadTextureInfoAsync(e+"/baseColorTexture",o.baseColorTexture,(function(e){return n.albedoTexture=e,Promise.resolve()})))),t.doubleSided&&(n.backFaceCulling=!1,n.twoSidedLighting=!0),this._loader.loadMaterialAlphaProperties(e,t,n),Promise.all(r).then((function(){}))},e})(),t.KHR_materials_unlit=r,o.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={})),(function(c){var d,e;d=c.GLTF2||(c.GLTF2={}),(function(e){var u,t,n="KHR_lights_punctual";(t=u||(u={})).DIRECTIONAL="directional",t.POINT="point",t.SPOT="spot";var r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader,delete this._lights},e.prototype.onLoading=function(){var e=this._loader.gltf.extensions;if(e&&e[this.name]){var t=e[this.name];this._lights=t.lights}},e.prototype.loadNodeAsync=function(e,t,s){var l=this;return d.GLTFLoader.LoadExtensionAsync(e,t,this.name,(function(a,i){return l._loader.loadNodeAsync(e,t,(function(e){var t,n=d.ArrayItem.Get(a,l._lights,i.light),r=n.name||e.name;switch(n.type){case u.DIRECTIONAL:t=new c.DirectionalLight(r,c.Vector3.Backward(),l._loader.babylonScene);break;case u.POINT:t=new c.PointLight(r,c.Vector3.Zero(),l._loader.babylonScene);break;case u.SPOT:var o=new c.SpotLight(r,c.Vector3.Zero(),c.Vector3.Backward(),0,1,l._loader.babylonScene);o.angle=2*(n.spot&&n.spot.outerConeAngle||Math.PI/4),o.innerAngle=2*(n.spot&&n.spot.innerConeAngle||0),t=o;break;default:throw new Error(a+": Invalid light type ("+n.type+")")}t.falloffType=c.Light.FALLOFF_GLTF,t.diffuse=n.color?c.Color3.FromArray(n.color):c.Color3.White(),t.intensity=null==n.intensity?1:n.intensity,t.range=null==n.range?Number.MAX_VALUE:n.range,t.parent=e,s(e)}))}))},e})();e.KHR_lights=r,d.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})((e=d.Loader||(d.Loader={})).Extensions||(e.Extensions={}))})(BABYLON||(BABYLON={})),(function(i){var t,e,n,r,o;t=i.GLTF2||(i.GLTF2={}),e=t.Loader||(t.Loader={}),n=e.Extensions||(e.Extensions={}),r="KHR_texture_transform",o=(function(){function e(e){this.name=r,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader},e.prototype.loadTextureInfoAsync=function(e,r,o){var a=this;return t.GLTFLoader.LoadExtensionAsync(e,r,this.name,(function(t,n){return a._loader.loadTextureInfoAsync(e,r,(function(e){if(!(e instanceof i.Texture))throw new Error(t+": Texture type not supported");n.offset&&(e.uOffset=n.offset[0],e.vOffset=n.offset[1]),e.uRotationCenter=0,e.vRotationCenter=0,n.rotation&&(e.wAng=-n.rotation),n.scale&&(e.uScale=n.scale[0],e.vScale=n.scale[1]),null!=n.texCoord&&(e.coordinatesIndex=n.texCoord),o(e)}))}))},e})(),n.KHR_texture_transform=o,t.GLTFLoader.RegisterExtension(r,(function(e){return new o(e)}))})(BABYLON||(BABYLON={})),(function(d){var f,e,t,n,r;f=d.GLTF2||(d.GLTF2={}),e=f.Loader||(f.Loader={}),t=e.Extensions||(e.Extensions={}),n="EXT_lights_image_based",r=(function(){function e(e){this.name=n,this.enabled=!0,this._loader=e}return e.prototype.dispose=function(){delete this._loader,delete this._lights},e.prototype.onLoading=function(){var e=this._loader.gltf.extensions;if(e&&e[this.name]){var t=e[this.name];this._lights=t.lights}},e.prototype.loadSceneAsync=function(o,a){var i=this;return f.GLTFLoader.LoadExtensionAsync(o,a,this.name,(function(e,t){var n=new Array;n.push(i._loader.loadSceneAsync(o,a)),i._loader.logOpen(""+e);var r=f.ArrayItem.Get(e+"/light",i._lights,t.light);return n.push(i._loadLightAsync("#/extensions/"+i.name+"/lights/"+t.light,r).then((function(e){i._loader.babylonScene.environmentTexture=e}))),i._loader.logClose(),Promise.all(n).then((function(){}))}))},e.prototype._loadLightAsync=function(i,s){var a=this;if(!s._loaded){var l=new Array;this._loader.logOpen(""+i);for(var u=new Array(s.specularImages.length),e=function(o){var a=s.specularImages[o];u[o]=new Array(a.length);for(var e=function(t){var e=i+"/specularImages/"+o+"/"+t;c._loader.logOpen(""+e);var n=a[t],r=f.ArrayItem.Get(e,c._loader.gltf.images,n);l.push(c._loader.loadImageAsync("#/images/"+n,r).then((function(e){u[o][t]=e}))),c._loader.logClose()},t=0;t<a.length;t++)e(t)},c=this,t=0;t<s.specularImages.length;t++)e(t);this._loader.logClose(),s._loaded=Promise.all(l).then((function(){var e=new d.RawCubeTexture(a._loader.babylonScene,null,s.specularImageSize);if(s._babylonTexture=e,null!=s.intensity&&(e.level=s.intensity),s.rotation){var t=d.Quaternion.FromArray(s.rotation);a._loader.babylonScene.useRightHandedSystem||(t=d.Quaternion.Inverse(t)),d.Matrix.FromQuaternionToRef(t,e.getReflectionTextureMatrix())}var n=d.SphericalHarmonics.FromArray(s.irradianceCoefficients);n.scale(s.intensity),n.convertIrradianceToLambertianRadiance();var r=d.SphericalPolynomial.FromHarmonics(n),o=(u.length-1)/d.Scalar.Log2(s.specularImageSize);return e.updateRGBDAsync(u,r,o)}))}return s._loaded.then((function(){return s._babylonTexture}))},e})(),t.EXT_lights_image_based=r,f.GLTFLoader.RegisterExtension(n,(function(e){return new r(e)}))})(BABYLON||(BABYLON={}));

var BABYLON,__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i])})(e,t)};return function(e,t){function i(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(i.prototype=t.prototype,new i)}})(),__decorate=this&&this.__decorate||function(e,t,i,r){var n,o=arguments.length,s=o<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;0<=a;a--)(n=e[a])&&(s=(o<3?n(s):3<o?n(t,i,s):n(t,i))||s);return 3<o&&s&&Object.defineProperty(t,i,s),s};!(function(u){var d=(function(t){function e(){var e=t.call(this)||this;return e.DIFFUSE=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.UV1=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.BonesPerMesh=0,e.NUM_BONE_INFLUENCERS=0,e.INSTANCES=!1,e.rebuild(),e}return __extends(e,t),e})(u.MaterialDefines),e=(function(r){function n(e,t){var i=r.call(this,e,t)||this;return i.diffuseColor=new u.Color3(1,1,1),i.speed=1,i._scaledDiffuse=new u.Color3,i._lastTime=0,i}return __extends(n,r),n.prototype.needAlphaBlending=function(){return!1},n.prototype.needAlphaTesting=function(){return!0},n.prototype.getAlphaTestTexture=function(){return null},n.prototype.isReadyForSubMesh=function(e,t,i){if(this.isFrozen&&this._wasPreviouslyReady&&t.effect)return!0;t._materialDefines||(t._materialDefines=new d);var r=t._materialDefines,n=this.getScene();if(!this.checkReadyOnEveryCall&&t.effect&&this._renderId===n.getRenderId())return!0;var o=n.getEngine();if(r._areTexturesDirty&&(r._needUVs=!1,this._diffuseTexture&&u.StandardMaterial.DiffuseTextureEnabled)){if(!this._diffuseTexture.isReady())return!1;r._needUVs=!0,r.DIFFUSE=!0}if(r.ALPHATEST=!!this._opacityTexture,r._areMiscDirty&&(r.POINTSIZE=this.pointsCloud||n.forcePointsCloud,r.FOG=n.fogEnabled&&e.applyFog&&n.fogMode!==u.Scene.FOGMODE_NONE&&this.fogEnabled),u.MaterialHelper.PrepareDefinesForFrameBoundValues(n,o,r,!!i),u.MaterialHelper.PrepareDefinesForAttributes(e,r,!1,!0),r.isDirty){r.markAsProcessed(),n.resetCachedMaterial();var s=new u.EffectFallbacks;r.FOG&&s.addFallback(1,"FOG"),0<r.NUM_BONE_INFLUENCERS&&s.addCPUSkinningFallback(0,e);var a=[u.VertexBuffer.PositionKind];r.UV1&&a.push(u.VertexBuffer.UVKind),r.VERTEXCOLOR&&a.push(u.VertexBuffer.ColorKind),u.MaterialHelper.PrepareAttributesForBones(a,e,r,s),u.MaterialHelper.PrepareAttributesForInstances(a,r);var f=r.toString();t.setEffect(n.getEngine().createEffect("fire",{attributes:a,uniformsNames:["world","view","viewProjection","vEyePosition","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix","time","speed"],uniformBuffersNames:[],samplers:["diffuseSampler","distortionSampler","opacitySampler"],defines:f,fallbacks:s,onCompiled:this.onCompiled,onError:this.onError,indexParameters:null,maxSimultaneousLights:4,transformFeedbackVaryings:null},o),r)}return!(!t.effect||!t.effect.isReady())&&(this._renderId=n.getRenderId(),this._wasPreviouslyReady=!0)},n.prototype.bindForSubMesh=function(e,t,i){var r=this.getScene();if(i._materialDefines){var n=i.effect;n&&(this._activeEffect=n,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",r.getTransformMatrix()),u.MaterialHelper.BindBonesParameters(t,this._activeEffect),this._mustRebind(r,n)&&(this._diffuseTexture&&u.StandardMaterial.DiffuseTextureEnabled&&(this._activeEffect.setTexture("diffuseSampler",this._diffuseTexture),this._activeEffect.setFloat2("vDiffuseInfos",this._diffuseTexture.coordinatesIndex,this._diffuseTexture.level),this._activeEffect.setMatrix("diffuseMatrix",this._diffuseTexture.getTextureMatrix()),this._activeEffect.setTexture("distortionSampler",this._distortionTexture),this._activeEffect.setTexture("opacitySampler",this._opacityTexture)),u.MaterialHelper.BindClipPlane(this._activeEffect,r),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),u.MaterialHelper.BindEyePosition(n,r)),this._activeEffect.setColor4("vDiffuseColor",this._scaledDiffuse,this.alpha*t.visibility),r.fogEnabled&&t.applyFog&&r.fogMode!==u.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",r.getViewMatrix()),u.MaterialHelper.BindFogParameters(r,t,this._activeEffect),this._lastTime+=r.getEngine().getDeltaTime(),this._activeEffect.setFloat("time",this._lastTime),this._activeEffect.setFloat("speed",this.speed),this._afterBind(t,this._activeEffect))}},n.prototype.getAnimatables=function(){var e=[];return this._diffuseTexture&&this._diffuseTexture.animations&&0<this._diffuseTexture.animations.length&&e.push(this._diffuseTexture),this._distortionTexture&&this._distortionTexture.animations&&0<this._distortionTexture.animations.length&&e.push(this._distortionTexture),this._opacityTexture&&this._opacityTexture.animations&&0<this._opacityTexture.animations.length&&e.push(this._opacityTexture),e},n.prototype.getActiveTextures=function(){var e=r.prototype.getActiveTextures.call(this);return this._diffuseTexture&&e.push(this._diffuseTexture),this._distortionTexture&&e.push(this._distortionTexture),this._opacityTexture&&e.push(this._opacityTexture),e},n.prototype.hasTexture=function(e){return!!r.prototype.hasTexture.call(this,e)||(this._diffuseTexture===e||(this._distortionTexture===e||this._opacityTexture===e))},n.prototype.getClassName=function(){return"FireMaterial"},n.prototype.dispose=function(e){this._diffuseTexture&&this._diffuseTexture.dispose(),this._distortionTexture&&this._distortionTexture.dispose(),r.prototype.dispose.call(this,e)},n.prototype.clone=function(e){var t=this;return u.SerializationHelper.Clone((function(){return new n(e,t.getScene())}),this)},n.prototype.serialize=function(){var e=r.prototype.serialize.call(this);return e.customType="BABYLON.FireMaterial",e.diffuseColor=this.diffuseColor.asArray(),e.speed=this.speed,this._diffuseTexture&&(e._diffuseTexture=this._diffuseTexture.serialize()),this._distortionTexture&&(e._distortionTexture=this._distortionTexture.serialize()),this._opacityTexture&&(e._opacityTexture=this._opacityTexture.serialize()),e},n.Parse=function(e,t,i){var r=new n(e.name,t);return r.diffuseColor=u.Color3.FromArray(e.diffuseColor),r.speed=e.speed,r.alpha=e.alpha,r.id=e.id,u.Tags.AddTagsTo(r,e.tags),r.backFaceCulling=e.backFaceCulling,r.wireframe=e.wireframe,e._diffuseTexture&&(r._diffuseTexture=u.Texture.Parse(e._diffuseTexture,t,i)),e._distortionTexture&&(r._distortionTexture=u.Texture.Parse(e._distortionTexture,t,i)),e._opacityTexture&&(r._opacityTexture=u.Texture.Parse(e._opacityTexture,t,i)),e.checkReadyOnlyOnce&&(r.checkReadyOnlyOnce=e.checkReadyOnlyOnce),r},__decorate([u.serializeAsTexture("diffuseTexture")],n.prototype,"_diffuseTexture",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"diffuseTexture",void 0),__decorate([u.serializeAsTexture("distortionTexture")],n.prototype,"_distortionTexture",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"distortionTexture",void 0),__decorate([u.serializeAsTexture("opacityTexture")],n.prototype,"_opacityTexture",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsTexturesDirty")],n.prototype,"opacityTexture",void 0),__decorate([u.serializeAsColor3("diffuse")],n.prototype,"diffuseColor",void 0),__decorate([u.serialize()],n.prototype,"speed",void 0),n})(u.PushMaterial);u.FireMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.fireVertexShader="precision highp float;\n\nattribute vec3 position;\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n\nuniform float time;\nuniform float speed;\n#ifdef DIFFUSE\nvarying vec2 vDistortionCoords1;\nvarying vec2 vDistortionCoords2;\nvarying vec2 vDistortionCoords3;\n#endif\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n\n#ifdef DIFFUSE\nvDiffuseUV=uv;\nvDiffuseUV.y-=0.2;\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n#ifdef DIFFUSE\n\nvec3 layerSpeed=vec3(-0.2,-0.52,-0.1)*speed;\nvDistortionCoords1.x=uv.x;\nvDistortionCoords1.y=uv.y+layerSpeed.x*time/1000.0;\nvDistortionCoords2.x=uv.x;\nvDistortionCoords2.y=uv.y+layerSpeed.y*time/1000.0;\nvDistortionCoords3.x=uv.x;\nvDistortionCoords3.y=uv.y+layerSpeed.z*time/1000.0;\n#endif\n}\n",BABYLON.Effect.ShadersStore.firePixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n\nuniform sampler2D distortionSampler;\nuniform sampler2D opacitySampler;\n#ifdef DIFFUSE\nvarying vec2 vDistortionCoords1;\nvarying vec2 vDistortionCoords2;\nvarying vec2 vDistortionCoords3;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvec4 bx2(vec4 x)\n{\nreturn vec4(2.0)*x-vec4(1.0);\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\n\nfloat alpha=1.0;\n#ifdef DIFFUSE\n\nconst float distortionAmount0=0.092;\nconst float distortionAmount1=0.092;\nconst float distortionAmount2=0.092;\nvec2 heightAttenuation=vec2(0.3,0.39);\nvec4 noise0=texture2D(distortionSampler,vDistortionCoords1);\nvec4 noise1=texture2D(distortionSampler,vDistortionCoords2);\nvec4 noise2=texture2D(distortionSampler,vDistortionCoords3);\nvec4 noiseSum=bx2(noise0)*distortionAmount0+bx2(noise1)*distortionAmount1+bx2(noise2)*distortionAmount2;\nvec4 perturbedBaseCoords=vec4(vDiffuseUV,0.0,1.0)+noiseSum*(vDiffuseUV.y*heightAttenuation.x+heightAttenuation.y);\nvec4 opacityColor=texture2D(opacitySampler,perturbedBaseCoords.xy);\n#ifdef ALPHATEST\nif (opacityColor.r<0.1)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor=texture2D(diffuseSampler,perturbedBaseCoords.xy)*2.0;\nbaseColor*=opacityColor;\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\nvec3 diffuseBase=vec3(1.0,1.0,1.0);\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n\nvec4 color=vec4(baseColor.rgb,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i])})(e,t)};return function(e,t){function i(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(i.prototype=t.prototype,new i)}})(),__decorate=this&&this.__decorate||function(e,t,i,r){var n,f=arguments.length,o=f<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;0<=a;a--)(n=e[a])&&(o=(f<3?n(o):3<f?n(t,i,o):n(t,i))||o);return 3<f&&o&&Object.defineProperty(t,i,o),o};!(function(h){var d=(function(t){function e(){var e=t.call(this)||this;return e.DIFFUSE=!1,e.HEIGHTMAP=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.NORMAL=!1,e.UV1=!1,e.UV2=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.NUM_BONE_INFLUENCERS=0,e.BonesPerMesh=0,e.INSTANCES=!1,e.HIGHLEVEL=!1,e.rebuild(),e}return __extends(e,t),e})(h.MaterialDefines),e=(function(r){function a(e,t){var i=r.call(this,e,t)||this;return i.diffuseColor=new h.Color3(1,1,1),i.furLength=1,i.furAngle=0,i.furColor=new h.Color3(.44,.21,.02),i.furOffset=0,i.furSpacing=12,i.furGravity=new h.Vector3(0,0,0),i.furSpeed=100,i.furDensity=20,i.furOcclusion=0,i._disableLighting=!1,i._maxSimultaneousLights=4,i.highLevelFur=!0,i._furTime=0,i}return __extends(a,r),Object.defineProperty(a.prototype,"furTime",{get:function(){return this._furTime},set:function(e){this._furTime=e},enumerable:!0,configurable:!0}),a.prototype.needAlphaBlending=function(){return this.alpha<1},a.prototype.needAlphaTesting=function(){return!1},a.prototype.getAlphaTestTexture=function(){return null},a.prototype.updateFur=function(){for(var e=1;e<this._meshes.length;e++){var t=this._meshes[e].material;t.furLength=this.furLength,t.furAngle=this.furAngle,t.furGravity=this.furGravity,t.furSpacing=this.furSpacing,t.furSpeed=this.furSpeed,t.furColor=this.furColor,t.diffuseTexture=this.diffuseTexture,t.furTexture=this.furTexture,t.highLevelFur=this.highLevelFur,t.furTime=this.furTime,t.furDensity=this.furDensity}},a.prototype.isReadyForSubMesh=function(e,t,i){if(this.isFrozen&&this._wasPreviouslyReady&&t.effect)return!0;t._materialDefines||(t._materialDefines=new d);var r=t._materialDefines,n=this.getScene();if(!this.checkReadyOnEveryCall&&t.effect&&this._renderId===n.getRenderId())return!0;var f=n.getEngine();if(r._areTexturesDirty&&n.texturesEnabled){if(this.diffuseTexture&&h.StandardMaterial.DiffuseTextureEnabled){if(!this.diffuseTexture.isReady())return!1;r._needUVs=!0,r.DIFFUSE=!0}if(this.heightTexture&&f.getCaps().maxVertexTextureImageUnits){if(!this.heightTexture.isReady())return!1;r._needUVs=!0,r.HEIGHTMAP=!0}}if(this.highLevelFur!==r.HIGHLEVEL&&(r.HIGHLEVEL=!0,r.markAsUnprocessed()),h.MaterialHelper.PrepareDefinesForMisc(e,n,!1,this.pointsCloud,this.fogEnabled,this._shouldTurnAlphaTestOn(e),r),r._needNormals=h.MaterialHelper.PrepareDefinesForLights(n,e,r,!1,this._maxSimultaneousLights,this._disableLighting),h.MaterialHelper.PrepareDefinesForFrameBoundValues(n,f,r,!!i),h.MaterialHelper.PrepareDefinesForAttributes(e,r,!0,!0),r.isDirty){r.markAsProcessed(),n.resetCachedMaterial();var o=new h.EffectFallbacks;r.FOG&&o.addFallback(1,"FOG"),h.MaterialHelper.HandleFallbacksForShadows(r,o,this.maxSimultaneousLights),0<r.NUM_BONE_INFLUENCERS&&o.addCPUSkinningFallback(0,e);var a=[h.VertexBuffer.PositionKind];r.NORMAL&&a.push(h.VertexBuffer.NormalKind),r.UV1&&a.push(h.VertexBuffer.UVKind),r.UV2&&a.push(h.VertexBuffer.UV2Kind),r.VERTEXCOLOR&&a.push(h.VertexBuffer.ColorKind),h.MaterialHelper.PrepareAttributesForBones(a,e,r,o),h.MaterialHelper.PrepareAttributesForInstances(a,r);var s=r.toString(),u=["world","view","viewProjection","vEyePosition","vLightsType","vDiffuseColor","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix","furLength","furAngle","furColor","furOffset","furGravity","furTime","furSpacing","furDensity","furOcclusion"],l=["diffuseSampler","heightTexture","furTexture"],c=new Array;h.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:u,uniformBuffersNames:c,samplers:l,defines:r,maxSimultaneousLights:this.maxSimultaneousLights}),t.setEffect(n.getEngine().createEffect("fur",{attributes:a,uniformsNames:u,uniformBuffersNames:c,samplers:l,defines:s,fallbacks:o,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:this.maxSimultaneousLights}},f),r)}return!(!t.effect||!t.effect.isReady())&&(this._renderId=n.getRenderId(),this._wasPreviouslyReady=!0)},a.prototype.bindForSubMesh=function(e,t,i){var r=this.getScene(),n=i._materialDefines;if(n){var f=i.effect;f&&(this._activeEffect=f,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",r.getTransformMatrix()),h.MaterialHelper.BindBonesParameters(t,this._activeEffect),r.getCachedMaterial()!==this&&(this._diffuseTexture&&h.StandardMaterial.DiffuseTextureEnabled&&(this._activeEffect.setTexture("diffuseSampler",this._diffuseTexture),this._activeEffect.setFloat2("vDiffuseInfos",this._diffuseTexture.coordinatesIndex,this._diffuseTexture.level),this._activeEffect.setMatrix("diffuseMatrix",this._diffuseTexture.getTextureMatrix())),this._heightTexture&&this._activeEffect.setTexture("heightTexture",this._heightTexture),h.MaterialHelper.BindClipPlane(this._activeEffect,r),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),h.MaterialHelper.BindEyePosition(f,r)),this._activeEffect.setColor4("vDiffuseColor",this.diffuseColor,this.alpha*t.visibility),r.lightsEnabled&&!this.disableLighting&&h.MaterialHelper.BindLights(r,t,this._activeEffect,n,this.maxSimultaneousLights),r.fogEnabled&&t.applyFog&&r.fogMode!==h.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",r.getViewMatrix()),h.MaterialHelper.BindFogParameters(r,t,this._activeEffect),this._activeEffect.setFloat("furLength",this.furLength),this._activeEffect.setFloat("furAngle",this.furAngle),this._activeEffect.setColor4("furColor",this.furColor,1),this.highLevelFur&&(this._activeEffect.setVector3("furGravity",this.furGravity),this._activeEffect.setFloat("furOffset",this.furOffset),this._activeEffect.setFloat("furSpacing",this.furSpacing),this._activeEffect.setFloat("furDensity",this.furDensity),this._activeEffect.setFloat("furOcclusion",this.furOcclusion),this._furTime+=this.getScene().getEngine().getDeltaTime()/this.furSpeed,this._activeEffect.setFloat("furTime",this._furTime),this._activeEffect.setTexture("furTexture",this.furTexture)),this._afterBind(t,this._activeEffect))}},a.prototype.getAnimatables=function(){var e=[];return this.diffuseTexture&&this.diffuseTexture.animations&&0<this.diffuseTexture.animations.length&&e.push(this.diffuseTexture),this.heightTexture&&this.heightTexture.animations&&0<this.heightTexture.animations.length&&e.push(this.heightTexture),e},a.prototype.getActiveTextures=function(){var e=r.prototype.getActiveTextures.call(this);return this._diffuseTexture&&e.push(this._diffuseTexture),this._heightTexture&&e.push(this._heightTexture),e},a.prototype.hasTexture=function(e){return!!r.prototype.hasTexture.call(this,e)||(this.diffuseTexture===e||this._heightTexture===e)},a.prototype.dispose=function(e){if(this.diffuseTexture&&this.diffuseTexture.dispose(),this._meshes)for(var t=1;t<this._meshes.length;t++){var i=this._meshes[t].material;i&&i.dispose(e),this._meshes[t].dispose()}r.prototype.dispose.call(this,e)},a.prototype.clone=function(e){var t=this;return h.SerializationHelper.Clone((function(){return new a(e,t.getScene())}),this)},a.prototype.serialize=function(){var e=h.SerializationHelper.Serialize(this);return e.customType="BABYLON.FurMaterial",this._meshes&&(e.sourceMeshName=this._meshes[0].name,e.quality=this._meshes.length),e},a.prototype.getClassName=function(){return"FurMaterial"},a.Parse=function(i,r,e){var n=h.SerializationHelper.Parse((function(){return new a(i.name,r)}),i,r,e);return i.sourceMeshName&&n.highLevelFur&&r.executeWhenReady((function(){var e=r.getMeshByName(i.sourceMeshName);if(e){var t=a.GenerateTexture("Fur Texture",r);n.furTexture=t,a.FurifyMesh(e,i.quality)}})),n},a.GenerateTexture=function(e,t){for(var i=new h.DynamicTexture("FurTexture "+e,256,t,!0),r=i.getContext(),n=0;n<2e4;++n)r.fillStyle="rgba(255, "+Math.floor(255*Math.random())+", "+Math.floor(255*Math.random())+", 1)",r.fillRect(Math.random()*i.getSize().width,Math.random()*i.getSize().height,2,2);return i.update(!1),i.wrapU=h.Texture.WRAP_ADDRESSMODE,i.wrapV=h.Texture.WRAP_ADDRESSMODE,i},a.FurifyMesh=function(e,t){var i,r=[e],n=e.material;if(!(n instanceof a))throw"The material of the source mesh must be a Fur Material";for(i=1;i<t;i++){var f=new h.FurMaterial(n.name+i,e.getScene());e.getScene().materials.pop(),h.Tags.EnableFor(f),h.Tags.AddTagsTo(f,"furShellMaterial"),f.furLength=n.furLength,f.furAngle=n.furAngle,f.furGravity=n.furGravity,f.furSpacing=n.furSpacing,f.furSpeed=n.furSpeed,f.furColor=n.furColor,f.diffuseTexture=n.diffuseTexture,f.furOffset=i/t,f.furTexture=n.furTexture,f.highLevelFur=n.highLevelFur,f.furTime=n.furTime,f.furDensity=n.furDensity;var o=e.clone(e.name+i);o.material=f,o.skeleton=e.skeleton,o.position=h.Vector3.Zero(),r.push(o)}for(i=1;i<r.length;i++)r[i].parent=e;return e.material._meshes=r},__decorate([h.serializeAsTexture("diffuseTexture")],a.prototype,"_diffuseTexture",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],a.prototype,"diffuseTexture",void 0),__decorate([h.serializeAsTexture("heightTexture")],a.prototype,"_heightTexture",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsTexturesDirty")],a.prototype,"heightTexture",void 0),__decorate([h.serializeAsColor3()],a.prototype,"diffuseColor",void 0),__decorate([h.serialize()],a.prototype,"furLength",void 0),__decorate([h.serialize()],a.prototype,"furAngle",void 0),__decorate([h.serializeAsColor3()],a.prototype,"furColor",void 0),__decorate([h.serialize()],a.prototype,"furOffset",void 0),__decorate([h.serialize()],a.prototype,"furSpacing",void 0),__decorate([h.serializeAsVector3()],a.prototype,"furGravity",void 0),__decorate([h.serialize()],a.prototype,"furSpeed",void 0),__decorate([h.serialize()],a.prototype,"furDensity",void 0),__decorate([h.serialize()],a.prototype,"furOcclusion",void 0),__decorate([h.serialize("disableLighting")],a.prototype,"_disableLighting",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsLightsDirty")],a.prototype,"disableLighting",void 0),__decorate([h.serialize("maxSimultaneousLights")],a.prototype,"_maxSimultaneousLights",void 0),__decorate([h.expandToProperty("_markAllSubMeshesAsLightsDirty")],a.prototype,"maxSimultaneousLights",void 0),__decorate([h.serialize()],a.prototype,"highLevelFur",void 0),__decorate([h.serialize()],a.prototype,"furTime",null),a})(h.PushMaterial);h.FurMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.furVertexShader="precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\nuniform float furLength;\nuniform float furAngle;\n#ifdef HIGHLEVEL\nuniform float furOffset;\nuniform vec3 furGravity;\nuniform float furTime;\nuniform float furSpacing;\nuniform float furDensity;\n#endif\n#ifdef HEIGHTMAP\nuniform sampler2D heightTexture;\n#endif\n#ifdef HIGHLEVEL\nvarying vec2 vFurUV;\n#endif\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\nvarying float vfur_length;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nfloat Rand(vec3 rv) {\nfloat x=dot(rv,vec3(12.9898,78.233,24.65487));\nreturn fract(sin(x)*43758.5453);\n}\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\n\nfloat r=Rand(position);\n#ifdef HEIGHTMAP\n#if __VERSION__>100\nvfur_length=furLength*texture(heightTexture,uv).x;\n#else\nvfur_length=furLength*texture2D(heightTexture,uv).r;\n#endif\n#else \nvfur_length=(furLength*r);\n#endif\nvec3 tangent1=vec3(normal.y,-normal.x,0);\nvec3 tangent2=vec3(-normal.z,0,normal.x);\nr=Rand(tangent1*r);\nfloat J=(2.0+4.0*r);\nr=Rand(tangent2*r);\nfloat K=(2.0+2.0*r);\ntangent1=tangent1*J+tangent2*K;\ntangent1=normalize(tangent1);\nvec3 newPosition=position+normal*vfur_length*cos(furAngle)+tangent1*vfur_length*sin(furAngle);\n#ifdef HIGHLEVEL\n\nvec3 forceDirection=vec3(0.0,0.0,0.0);\nforceDirection.x=sin(furTime+position.x*0.05)*0.2;\nforceDirection.y=cos(furTime*0.7+position.y*0.04)*0.2;\nforceDirection.z=sin(furTime*0.7+position.z*0.04)*0.2;\nvec3 displacement=vec3(0.0,0.0,0.0);\ndisplacement=furGravity+forceDirection;\nfloat displacementFactor=pow(furOffset,3.0);\nvec3 aNormal=normal;\naNormal.xyz+=displacement*displacementFactor;\nnewPosition=vec3(newPosition.x,newPosition.y,newPosition.z)+(normalize(aNormal)*furOffset*furSpacing);\n#endif\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\ngl_Position=viewProjection*finalWorld*vec4(newPosition,1.0);\nvec4 worldPos=finalWorld*vec4(newPosition,1.0);\nvPositionW=vec3(worldPos);\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#ifdef HIGHLEVEL\nvFurUV=vDiffuseUV*furDensity;\n#endif\n#else\n#ifdef HIGHLEVEL\nvFurUV=uv*furDensity;\n#endif\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n",BABYLON.Effect.ShadersStore.furPixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nuniform vec4 furColor;\nuniform float furLength;\nvarying vec3 vPositionW;\nvarying float vfur_length;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n\n#ifdef HIGHLEVEL\nuniform float furOffset;\nuniform float furOcclusion;\nuniform sampler2D furTexture;\nvarying vec2 vFurUV;\n#endif\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#include<fogFragmentDeclaration>\n#include<clipPlaneFragmentDeclaration>\nfloat Rand(vec3 rv) {\nfloat x=dot(rv,vec3(12.9898,78.233,24.65487));\nreturn fract(sin(x)*43758.5453);\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=furColor;\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nbaseColor*=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n#ifdef HIGHLEVEL\n\nvec4 furTextureColor=texture2D(furTexture,vec2(vFurUV.x,vFurUV.y));\nif (furTextureColor.a<=0.0 || furTextureColor.g<furOffset) {\ndiscard;\n}\nfloat occlusion=mix(0.0,furTextureColor.b*1.2,furOffset);\nbaseColor=vec4(baseColor.xyz*max(occlusion,furOcclusion),1.1-furOffset);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#ifdef SPECULARTERM\nvec3 specularBase=vec3(0.,0.,0.);\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase.rgb*baseColor.rgb,0.0,1.0);\n\n#ifdef HIGHLEVEL\nvec4 color=vec4(finalDiffuse,alpha);\n#else\nfloat r=vfur_length/furLength*0.5;\nvec4 color=vec4(finalDiffuse*(0.5+r),alpha);\n#endif\n#include<fogFragment>\ngl_FragColor=color;\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,n){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,n){e.__proto__=n}||function(e,n){for(var i in n)n.hasOwnProperty(i)&&(e[i]=n[i])})(e,n)};return function(e,n){function i(){this.constructor=e}t(e,n),e.prototype=null===n?Object.create(n):(i.prototype=n.prototype,new i)}})(),__decorate=this&&this.__decorate||function(e,n,i,t){var o,r=arguments.length,a=r<3?n:null===t?t=Object.getOwnPropertyDescriptor(n,i):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,n,i,t);else for(var s=e.length-1;0<=s;s--)(o=e[s])&&(a=(r<3?o(a):3<r?o(n,i,a):o(n,i))||a);return 3<r&&a&&Object.defineProperty(n,i,a),a};!(function(u){var p=(function(n){function e(){var e=n.call(this)||this;return e.DIFFUSE=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.LIGHT0=!1,e.LIGHT1=!1,e.LIGHT2=!1,e.LIGHT3=!1,e.SPOTLIGHT0=!1,e.SPOTLIGHT1=!1,e.SPOTLIGHT2=!1,e.SPOTLIGHT3=!1,e.HEMILIGHT0=!1,e.HEMILIGHT1=!1,e.HEMILIGHT2=!1,e.HEMILIGHT3=!1,e.DIRLIGHT0=!1,e.DIRLIGHT1=!1,e.DIRLIGHT2=!1,e.DIRLIGHT3=!1,e.POINTLIGHT0=!1,e.POINTLIGHT1=!1,e.POINTLIGHT2=!1,e.POINTLIGHT3=!1,e.SHADOW0=!1,e.SHADOW1=!1,e.SHADOW2=!1,e.SHADOW3=!1,e.SHADOWS=!1,e.SHADOWESM0=!1,e.SHADOWESM1=!1,e.SHADOWESM2=!1,e.SHADOWESM3=!1,e.SHADOWPOISSON0=!1,e.SHADOWPOISSON1=!1,e.SHADOWPOISSON2=!1,e.SHADOWPOISSON3=!1,e.SHADOWPCF0=!1,e.SHADOWPCF1=!1,e.SHADOWPCF2=!1,e.SHADOWPCF3=!1,e.SHADOWPCSS0=!1,e.SHADOWPCSS1=!1,e.SHADOWPCSS2=!1,e.SHADOWPCSS3=!1,e.NORMAL=!1,e.UV1=!1,e.UV2=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.NUM_BONE_INFLUENCERS=0,e.BonesPerMesh=0,e.INSTANCES=!1,e.rebuild(),e}return __extends(e,n),e})(u.MaterialDefines),e=(function(t){function o(e,n){var i=t.call(this,e,n)||this;return i._maxSimultaneousLights=4,i.topColor=new u.Color3(1,0,0),i.topColorAlpha=1,i.bottomColor=new u.Color3(0,0,1),i.bottomColorAlpha=1,i.offset=0,i.scale=1,i.smoothness=1,i.disableLighting=!1,i._scaledDiffuse=new u.Color3,i}return __extends(o,t),o.prototype.needAlphaBlending=function(){return this.alpha<1||this.topColorAlpha<1||this.bottomColorAlpha<1},o.prototype.needAlphaTesting=function(){return!0},o.prototype.getAlphaTestTexture=function(){return null},o.prototype.isReadyForSubMesh=function(e,n,i){if(this.isFrozen&&this._wasPreviouslyReady&&n.effect)return!0;n._materialDefines||(n._materialDefines=new p);var t=n._materialDefines,o=this.getScene();if(!this.checkReadyOnEveryCall&&n.effect&&this._renderId===o.getRenderId())return!0;var r=o.getEngine();if(u.MaterialHelper.PrepareDefinesForFrameBoundValues(o,r,t,!!i),u.MaterialHelper.PrepareDefinesForMisc(e,o,!1,this.pointsCloud,this.fogEnabled,this._shouldTurnAlphaTestOn(e),t),t._needNormals=u.MaterialHelper.PrepareDefinesForLights(o,e,t,!1,this._maxSimultaneousLights),u.MaterialHelper.PrepareDefinesForAttributes(e,t,!1,!0),t.isDirty){t.markAsProcessed(),o.resetCachedMaterial();var a=new u.EffectFallbacks;t.FOG&&a.addFallback(1,"FOG"),u.MaterialHelper.HandleFallbacksForShadows(t,a),0<t.NUM_BONE_INFLUENCERS&&a.addCPUSkinningFallback(0,e);var s=[u.VertexBuffer.PositionKind];t.NORMAL&&s.push(u.VertexBuffer.NormalKind),t.UV1&&s.push(u.VertexBuffer.UVKind),t.UV2&&s.push(u.VertexBuffer.UV2Kind),t.VERTEXCOLOR&&s.push(u.VertexBuffer.ColorKind),u.MaterialHelper.PrepareAttributesForBones(s,e,t,a),u.MaterialHelper.PrepareAttributesForInstances(s,t);var l=t.toString(),f=["world","view","viewProjection","vEyePosition","vLightsType","vDiffuseColor","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix","topColor","bottomColor","offset","smoothness","scale"],c=["diffuseSampler"],d=new Array;u.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:f,uniformBuffersNames:d,samplers:c,defines:t,maxSimultaneousLights:4}),n.setEffect(o.getEngine().createEffect("gradient",{attributes:s,uniformsNames:f,uniformBuffersNames:d,samplers:c,defines:l,fallbacks:a,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:4}},r),t)}return!(!n.effect||!n.effect.isReady())&&(this._renderId=o.getRenderId(),this._wasPreviouslyReady=!0)},o.prototype.bindForSubMesh=function(e,n,i){var t=this.getScene(),o=i._materialDefines;if(o){var r=i.effect;r&&(this._activeEffect=r,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",t.getTransformMatrix()),u.MaterialHelper.BindBonesParameters(n,r),this._mustRebind(t,r)&&(u.MaterialHelper.BindClipPlane(r,t),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),u.MaterialHelper.BindEyePosition(r,t)),this._activeEffect.setColor4("vDiffuseColor",this._scaledDiffuse,this.alpha*n.visibility),t.lightsEnabled&&!this.disableLighting&&u.MaterialHelper.BindLights(t,n,this._activeEffect,o),t.fogEnabled&&n.applyFog&&t.fogMode!==u.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",t.getViewMatrix()),u.MaterialHelper.BindFogParameters(t,n,this._activeEffect),this._activeEffect.setColor4("topColor",this.topColor,this.topColorAlpha),this._activeEffect.setColor4("bottomColor",this.bottomColor,this.bottomColorAlpha),this._activeEffect.setFloat("offset",this.offset),this._activeEffect.setFloat("scale",this.scale),this._activeEffect.setFloat("smoothness",this.smoothness),this._afterBind(n,this._activeEffect))}},o.prototype.getAnimatables=function(){return[]},o.prototype.dispose=function(e){t.prototype.dispose.call(this,e)},o.prototype.clone=function(e){var n=this;return u.SerializationHelper.Clone((function(){return new o(e,n.getScene())}),this)},o.prototype.serialize=function(){var e=u.SerializationHelper.Serialize(this);return e.customType="BABYLON.GradientMaterial",e},o.prototype.getClassName=function(){return"GradientMaterial"},o.Parse=function(e,n,i){return u.SerializationHelper.Parse((function(){return new o(e.name,n)}),e,n,i)},__decorate([u.serialize("maxSimultaneousLights")],o.prototype,"_maxSimultaneousLights",void 0),__decorate([u.expandToProperty("_markAllSubMeshesAsLightsDirty")],o.prototype,"maxSimultaneousLights",void 0),__decorate([u.serializeAsColor3()],o.prototype,"topColor",void 0),__decorate([u.serialize()],o.prototype,"topColorAlpha",void 0),__decorate([u.serializeAsColor3()],o.prototype,"bottomColor",void 0),__decorate([u.serialize()],o.prototype,"bottomColorAlpha",void 0),__decorate([u.serialize()],o.prototype,"offset",void 0),__decorate([u.serialize()],o.prototype,"scale",void 0),__decorate([u.serialize()],o.prototype,"smoothness",void 0),__decorate([u.serialize()],o.prototype,"disableLighting",void 0),o})(u.PushMaterial);u.GradientMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.gradientVertexShader="precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\nvarying vec3 vPosition;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex> \ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\nvPosition=position;\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n",BABYLON.Effect.ShadersStore.gradientPixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nuniform vec4 topColor;\nuniform vec4 bottomColor;\nuniform float offset;\nuniform float scale;\nuniform float smoothness;\n\nvarying vec3 vPositionW;\nvarying vec3 vPosition;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0]\n#include<__decl__lightFragment>[1]\n#include<__decl__lightFragment>[2]\n#include<__decl__lightFragment>[3]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\nfloat h=vPosition.y*scale+offset;\nfloat mysmoothness=clamp(smoothness,0.01,max(smoothness,10.));\nvec4 baseColor=mix(bottomColor,topColor,max(pow(max(h,0.0),mysmoothness),0.0));\n\nvec3 diffuseColor=baseColor.rgb;\n\nfloat alpha=baseColor.a;\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0]\n#include<lightFragment>[1]\n#include<lightFragment>[2]\n#include<lightFragment>[3]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}\n";

var BABYLON,__extends=this&&this.__extends||(function(){var n=function(i,t){return(n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(i,t){i.__proto__=t}||function(i,t){for(var e in t)t.hasOwnProperty(e)&&(i[e]=t[e])})(i,t)};return function(i,t){function e(){this.constructor=i}n(i,t),i.prototype=null===t?Object.create(t):(e.prototype=t.prototype,new e)}})(),__decorate=this&&this.__decorate||function(i,t,e,n){var o,r=arguments.length,a=r<3?t:null===n?n=Object.getOwnPropertyDescriptor(t,e):n;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(i,t,e,n);else for(var l=i.length-1;0<=l;l--)(o=i[l])&&(a=(r<3?o(a):3<r?o(t,e,a):o(t,e))||a);return 3<r&&a&&Object.defineProperty(t,e,a),a};!(function(l){var s=(function(t){function i(){var i=t.call(this)||this;return i.TRANSPARENT=!1,i.FOG=!1,i.PREMULTIPLYALPHA=!1,i.rebuild(),i}return __extends(i,t),i})(l.MaterialDefines),i=(function(n){function o(i,t){var e=n.call(this,i,t)||this;return e.mainColor=l.Color3.Black(),e.lineColor=l.Color3.Teal(),e.gridRatio=1,e.gridOffset=l.Vector3.Zero(),e.majorUnitFrequency=10,e.minorUnitVisibility=.33,e.opacity=1,e.preMultiplyAlpha=!1,e._gridControl=new l.Vector4(e.gridRatio,e.majorUnitFrequency,e.minorUnitVisibility,e.opacity),e}return __extends(o,n),o.prototype.needAlphaBlending=function(){return this.opacity<1},o.prototype.needAlphaBlendingForMesh=function(i){return this.needAlphaBlending()},o.prototype.isReadyForSubMesh=function(i,t,e){if(this.isFrozen&&this._wasPreviouslyReady&&t.effect)return!0;t._materialDefines||(t._materialDefines=new s);var n=t._materialDefines,o=this.getScene();if(!this.checkReadyOnEveryCall&&t.effect&&this._renderId===o.getRenderId())return!0;if(n.TRANSPARENT!==this.opacity<1&&(n.TRANSPARENT=!n.TRANSPARENT,n.markAsUnprocessed()),n.PREMULTIPLYALPHA!=this.preMultiplyAlpha&&(n.PREMULTIPLYALPHA=!n.PREMULTIPLYALPHA,n.markAsUnprocessed()),l.MaterialHelper.PrepareDefinesForMisc(i,o,!1,!1,this.fogEnabled,!1,n),n.isDirty){n.markAsProcessed(),o.resetCachedMaterial();var r=[l.VertexBuffer.PositionKind,l.VertexBuffer.NormalKind],a=n.toString();t.setEffect(o.getEngine().createEffect("grid",r,["projection","worldView","mainColor","lineColor","gridControl","gridOffset","vFogInfos","vFogColor","world","view"],[],a,void 0,this.onCompiled,this.onError),n)}return!(!t.effect||!t.effect.isReady())&&(this._renderId=o.getRenderId(),this._wasPreviouslyReady=!0)},o.prototype.bindForSubMesh=function(i,t,e){var n=this.getScene();if(e._materialDefines){var o=e.effect;o&&(this._activeEffect=o,this.bindOnlyWorldMatrix(i),this._activeEffect.setMatrix("worldView",i.multiply(n.getViewMatrix())),this._activeEffect.setMatrix("view",n.getViewMatrix()),this._activeEffect.setMatrix("projection",n.getProjectionMatrix()),this._mustRebind(n,o)&&(this._activeEffect.setColor3("mainColor",this.mainColor),this._activeEffect.setColor3("lineColor",this.lineColor),this._activeEffect.setVector3("gridOffset",this.gridOffset),this._gridControl.x=this.gridRatio,this._gridControl.y=Math.round(this.majorUnitFrequency),this._gridControl.z=this.minorUnitVisibility,this._gridControl.w=this.opacity,this._activeEffect.setVector4("gridControl",this._gridControl)),l.MaterialHelper.BindFogParameters(n,t,this._activeEffect),this._afterBind(t,this._activeEffect))}},o.prototype.dispose=function(i){n.prototype.dispose.call(this,i)},o.prototype.clone=function(i){var t=this;return l.SerializationHelper.Clone((function(){return new o(i,t.getScene())}),this)},o.prototype.serialize=function(){var i=l.SerializationHelper.Serialize(this);return i.customType="BABYLON.GridMaterial",i},o.prototype.getClassName=function(){return"GridMaterial"},o.Parse=function(i,t,e){return l.SerializationHelper.Parse((function(){return new o(i.name,t)}),i,t,e)},__decorate([l.serializeAsColor3()],o.prototype,"mainColor",void 0),__decorate([l.serializeAsColor3()],o.prototype,"lineColor",void 0),__decorate([l.serialize()],o.prototype,"gridRatio",void 0),__decorate([l.serializeAsColor3()],o.prototype,"gridOffset",void 0),__decorate([l.serialize()],o.prototype,"majorUnitFrequency",void 0),__decorate([l.serialize()],o.prototype,"minorUnitVisibility",void 0),__decorate([l.serialize()],o.prototype,"opacity",void 0),__decorate([l.serialize()],o.prototype,"preMultiplyAlpha",void 0),o})(l.PushMaterial);l.GridMaterial=i})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.gridVertexShader="precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\n\nuniform mat4 projection;\nuniform mat4 world;\nuniform mat4 view;\nuniform mat4 worldView;\n\n#ifdef TRANSPARENT\nvarying vec4 vCameraSpacePosition;\n#endif\nvarying vec3 vPosition;\nvarying vec3 vNormal;\n#include<fogVertexDeclaration>\nvoid main(void) {\n#ifdef FOG\nvec4 worldPos=world*vec4(position,1.0);\n#endif\n#include<fogVertex>\nvec4 cameraSpacePosition=worldView*vec4(position,1.0);\ngl_Position=projection*cameraSpacePosition;\n#ifdef TRANSPARENT\nvCameraSpacePosition=cameraSpacePosition;\n#endif\nvPosition=position;\nvNormal=normal;\n}",BABYLON.Effect.ShadersStore.gridPixelShader="#extension GL_OES_standard_derivatives : enable\n#define SQRT2 1.41421356\n#define PI 3.14159\nprecision highp float;\nuniform vec3 mainColor;\nuniform vec3 lineColor;\nuniform vec4 gridControl;\nuniform vec3 gridOffset;\n\n#ifdef TRANSPARENT\nvarying vec4 vCameraSpacePosition;\n#endif\nvarying vec3 vPosition;\nvarying vec3 vNormal;\n#include<fogFragmentDeclaration>\nfloat getVisibility(float position) {\n\nfloat majorGridFrequency=gridControl.y;\nif (floor(position+0.5) == floor(position/majorGridFrequency+0.5)*majorGridFrequency)\n{\nreturn 1.0;\n} \nreturn gridControl.z;\n}\nfloat getAnisotropicAttenuation(float differentialLength) {\nconst float maxNumberOfLines=10.0;\nreturn clamp(1.0/(differentialLength+1.0)-1.0/maxNumberOfLines,0.0,1.0);\n}\nfloat isPointOnLine(float position,float differentialLength) {\nfloat fractionPartOfPosition=position-floor(position+0.5); \nfractionPartOfPosition/=differentialLength; \nfractionPartOfPosition=clamp(fractionPartOfPosition,-1.,1.);\nfloat result=0.5+0.5*cos(fractionPartOfPosition*PI); \nreturn result; \n}\nfloat contributionOnAxis(float position) {\nfloat differentialLength=length(vec2(dFdx(position),dFdy(position)));\ndifferentialLength*=SQRT2; \n\nfloat result=isPointOnLine(position,differentialLength);\n\nfloat visibility=getVisibility(position);\nresult*=visibility;\n\nfloat anisotropicAttenuation=getAnisotropicAttenuation(differentialLength);\nresult*=anisotropicAttenuation;\nreturn result;\n}\nfloat normalImpactOnAxis(float x) {\nfloat normalImpact=clamp(1.0-3.0*abs(x*x*x),0.0,1.0);\nreturn normalImpact;\n}\nvoid main(void) {\n\nfloat gridRatio=gridControl.x;\nvec3 gridPos=(vPosition+gridOffset)/gridRatio;\n\nfloat x=contributionOnAxis(gridPos.x);\nfloat y=contributionOnAxis(gridPos.y);\nfloat z=contributionOnAxis(gridPos.z);\n\nvec3 normal=normalize(vNormal);\nx*=normalImpactOnAxis(normal.x);\ny*=normalImpactOnAxis(normal.y);\nz*=normalImpactOnAxis(normal.z);\n\nfloat grid=clamp(x+y+z,0.,1.);\n\nvec3 color=mix(mainColor,lineColor,grid);\n#ifdef FOG\n#include<fogFragment>\n#endif\n#ifdef TRANSPARENT\nfloat distanceToFragment=length(vCameraSpacePosition.xyz);\nfloat cameraPassThrough=clamp(distanceToFragment-0.25,0.0,1.0);\nfloat opacity=clamp(grid,0.08,cameraPassThrough*gridControl.w*grid);\ngl_FragColor=vec4(color.rgb,opacity);\n#ifdef PREMULTIPLYALPHA\ngl_FragColor.rgb*=opacity;\n#endif\n#else\n\ngl_FragColor=vec4(color.rgb,1.0);\n#endif\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,i){e.__proto__=i}||function(e,i){for(var n in i)i.hasOwnProperty(n)&&(e[n]=i[n])})(e,i)};return function(e,i){function n(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(n.prototype=i.prototype,new n)}})(),__decorate=this&&this.__decorate||function(e,i,n,t){var r,o=arguments.length,a=o<3?i:null===t?t=Object.getOwnPropertyDescriptor(i,n):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,i,n,t);else for(var s=e.length-1;0<=s;s--)(r=e[s])&&(a=(o<3?r(a):3<o?r(i,n,a):r(i,n))||a);return 3<o&&a&&Object.defineProperty(i,n,a),a};!(function(c){var v=(function(i){function e(){var e=i.call(this)||this;return e.DIFFUSE=!1,e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.ALPHATEST=!1,e.DEPTHPREPASS=!1,e.POINTSIZE=!1,e.FOG=!1,e.LIGHT0=!1,e.LIGHT1=!1,e.LIGHT2=!1,e.LIGHT3=!1,e.SPOTLIGHT0=!1,e.SPOTLIGHT1=!1,e.SPOTLIGHT2=!1,e.SPOTLIGHT3=!1,e.HEMILIGHT0=!1,e.HEMILIGHT1=!1,e.HEMILIGHT2=!1,e.HEMILIGHT3=!1,e.DIRLIGHT0=!1,e.DIRLIGHT1=!1,e.DIRLIGHT2=!1,e.DIRLIGHT3=!1,e.POINTLIGHT0=!1,e.POINTLIGHT1=!1,e.POINTLIGHT2=!1,e.POINTLIGHT3=!1,e.SHADOW0=!1,e.SHADOW1=!1,e.SHADOW2=!1,e.SHADOW3=!1,e.SHADOWS=!1,e.SHADOWESM0=!1,e.SHADOWESM1=!1,e.SHADOWESM2=!1,e.SHADOWESM3=!1,e.SHADOWPOISSON0=!1,e.SHADOWPOISSON1=!1,e.SHADOWPOISSON2=!1,e.SHADOWPOISSON3=!1,e.SHADOWPCF0=!1,e.SHADOWPCF1=!1,e.SHADOWPCF2=!1,e.SHADOWPCF3=!1,e.SHADOWPCSS0=!1,e.SHADOWPCSS1=!1,e.SHADOWPCSS2=!1,e.SHADOWPCSS3=!1,e.NORMAL=!1,e.UV1=!1,e.UV2=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.NUM_BONE_INFLUENCERS=0,e.BonesPerMesh=0,e.INSTANCES=!1,e.rebuild(),e}return __extends(e,i),e})(c.MaterialDefines),e=(function(t){function r(e,i){var n=t.call(this,e,i)||this;return n.diffuseColor=new c.Color3(1,1,1),n._disableLighting=!1,n._maxSimultaneousLights=4,n}return __extends(r,t),r.prototype.needAlphaBlending=function(){return this.alpha<1},r.prototype.needAlphaTesting=function(){return!1},r.prototype.getAlphaTestTexture=function(){return null},r.prototype.isReadyForSubMesh=function(e,i,n){if(this.isFrozen&&this._wasPreviouslyReady&&i.effect)return!0;i._materialDefines||(i._materialDefines=new v);var t=i._materialDefines,r=this.getScene();if(!this.checkReadyOnEveryCall&&i.effect&&this._renderId===r.getRenderId())return!0;var o=r.getEngine();if(t._areTexturesDirty&&(t._needUVs=!1,r.texturesEnabled&&this._diffuseTexture&&c.StandardMaterial.DiffuseTextureEnabled)){if(!this._diffuseTexture.isReady())return!1;t._needUVs=!0,t.DIFFUSE=!0}if(c.MaterialHelper.PrepareDefinesForMisc(e,r,!1,this.pointsCloud,this.fogEnabled,this._shouldTurnAlphaTestOn(e),t),t._needNormals=c.MaterialHelper.PrepareDefinesForLights(r,e,t,!1,this._maxSimultaneousLights,this._disableLighting),c.MaterialHelper.PrepareDefinesForFrameBoundValues(r,o,t,!!n),c.MaterialHelper.PrepareDefinesForAttributes(e,t,!0,!0),t.isDirty){t.markAsProcessed(),r.resetCachedMaterial();var a=new c.EffectFallbacks;t.FOG&&a.addFallback(1,"FOG"),c.MaterialHelper.HandleFallbacksForShadows(t,a),0<t.NUM_BONE_INFLUENCERS&&a.addCPUSkinningFallback(0,e);var s=[c.VertexBuffer.PositionKind];t.NORMAL&&s.push(c.VertexBuffer.NormalKind),t.UV1&&s.push(c.VertexBuffer.UVKind),t.UV2&&s.push(c.VertexBuffer.UV2Kind),t.VERTEXCOLOR&&s.push(c.VertexBuffer.ColorKind),c.MaterialHelper.PrepareAttributesForBones(s,e,t,a),c.MaterialHelper.PrepareAttributesForInstances(s,t);var f=t.toString(),l=["world","view","viewProjection","vEyePosition","vLightsType","vDiffuseColor","vFogInfos","vFogColor","pointSize","vDiffuseInfos","mBones","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","diffuseMatrix"],u=["diffuseSampler"],d=new Array;c.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:l,uniformBuffersNames:d,samplers:u,defines:t,maxSimultaneousLights:4}),i.setEffect(r.getEngine().createEffect("normal",{attributes:s,uniformsNames:l,uniformBuffersNames:d,samplers:u,defines:f,fallbacks:a,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:4}},o),t)}return!(!i.effect||!i.effect.isReady())&&(this._renderId=r.getRenderId(),this._wasPreviouslyReady=!0)},r.prototype.bindForSubMesh=function(e,i,n){var t=this.getScene(),r=n._materialDefines;if(r){var o=n.effect;o&&(this._activeEffect=o,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",t.getTransformMatrix()),c.MaterialHelper.BindBonesParameters(i,this._activeEffect),this._mustRebind(t,o)&&(this.diffuseTexture&&c.StandardMaterial.DiffuseTextureEnabled&&(this._activeEffect.setTexture("diffuseSampler",this.diffuseTexture),this._activeEffect.setFloat2("vDiffuseInfos",this.diffuseTexture.coordinatesIndex,this.diffuseTexture.level),this._activeEffect.setMatrix("diffuseMatrix",this.diffuseTexture.getTextureMatrix())),c.MaterialHelper.BindClipPlane(this._activeEffect,t),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize),c.MaterialHelper.BindEyePosition(o,t)),this._activeEffect.setColor4("vDiffuseColor",this.diffuseColor,this.alpha*i.visibility),t.lightsEnabled&&!this.disableLighting&&c.MaterialHelper.BindLights(t,i,this._activeEffect,r),t.fogEnabled&&i.applyFog&&t.fogMode!==c.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",t.getViewMatrix()),c.MaterialHelper.BindFogParameters(t,i,this._activeEffect),this._afterBind(i,this._activeEffect))}},r.prototype.getAnimatables=function(){var e=[];return this.diffuseTexture&&this.diffuseTexture.animations&&0<this.diffuseTexture.animations.length&&e.push(this.diffuseTexture),e},r.prototype.getActiveTextures=function(){var e=t.prototype.getActiveTextures.call(this);return this._diffuseTexture&&e.push(this._diffuseTexture),e},r.prototype.hasTexture=function(e){return!!t.prototype.hasTexture.call(this,e)||this.diffuseTexture===e},r.prototype.dispose=function(e){this.diffuseTexture&&this.diffuseTexture.dispose(),t.prototype.dispose.call(this,e)},r.prototype.clone=function(e){var i=this;return c.SerializationHelper.Clone((function(){return new r(e,i.getScene())}),this)},r.prototype.serialize=function(){var e=c.SerializationHelper.Serialize(this);return e.customType="BABYLON.NormalMaterial",e},r.prototype.getClassName=function(){return"NormalMaterial"},r.Parse=function(e,i,n){return c.SerializationHelper.Parse((function(){return new r(e.name,i)}),e,i,n)},__decorate([c.serializeAsTexture("diffuseTexture")],r.prototype,"_diffuseTexture",void 0),__decorate([c.expandToProperty("_markAllSubMeshesAsTexturesDirty")],r.prototype,"diffuseTexture",void 0),__decorate([c.serializeAsColor3()],r.prototype,"diffuseColor",void 0),__decorate([c.serialize("disableLighting")],r.prototype,"_disableLighting",void 0),__decorate([c.expandToProperty("_markAllSubMeshesAsLightsDirty")],r.prototype,"disableLighting",void 0),__decorate([c.serialize("maxSimultaneousLights")],r.prototype,"_maxSimultaneousLights",void 0),__decorate([c.expandToProperty("_markAllSubMeshesAsLightsDirty")],r.prototype,"maxSimultaneousLights",void 0),r})(c.PushMaterial);c.NormalMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.normalVertexShader="precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n",BABYLON.Effect.ShadersStore.normalPixelShader="precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0]\n#include<__decl__lightFragment>[1]\n#include<__decl__lightFragment>[2]\n#include<__decl__lightFragment>[3]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nbaseColor=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef NORMAL\nbaseColor=mix(baseColor,vec4(vNormalW,1.0),0.5);\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0]\n#include<lightFragment>[1]\n#include<lightFragment>[2]\n#include<lightFragment>[3]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var i=function(e,t){return(i=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)};return function(e,t){function n(){this.constructor=e}i(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}})(),__decorate=this&&this.__decorate||function(e,t,n,i){var o,a=arguments.length,r=a<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,n):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,n,i);else for(var c=e.length-1;0<=c;c--)(o=e[c])&&(r=(a<3?o(r):3<a?o(t,n,r):o(t,n))||r);return 3<a&&r&&Object.defineProperty(t,n,r),r};!(function(l){var s=(function(t){function e(){var e=t.call(this)||this;return e.CLIPPLANE=!1,e.CLIPPLANE2=!1,e.CLIPPLANE3=!1,e.CLIPPLANE4=!1,e.POINTSIZE=!1,e.FOG=!1,e.VERTEXCOLOR=!1,e.VERTEXALPHA=!1,e.rebuild(),e}return __extends(e,t),e})(l.MaterialDefines),e=(function(i){function o(e,t){var n=i.call(this,e,t)||this;return n.luminance=1,n.turbidity=10,n.rayleigh=2,n.mieCoefficient=.005,n.mieDirectionalG=.8,n.distance=500,n.inclination=.49,n.azimuth=.25,n.sunPosition=new l.Vector3(0,100,0),n.useSunPosition=!1,n._cameraPosition=l.Vector3.Zero(),n}return __extends(o,i),o.prototype.needAlphaBlending=function(){return this.alpha<1},o.prototype.needAlphaTesting=function(){return!1},o.prototype.getAlphaTestTexture=function(){return null},o.prototype.isReadyForSubMesh=function(e,t,n){if(this.isFrozen&&this._wasPreviouslyReady&&t.effect)return!0;t._materialDefines||(t._materialDefines=new s);var i=t._materialDefines,o=this.getScene();if(!this.checkReadyOnEveryCall&&t.effect&&this._renderId===o.getRenderId())return!0;if(l.MaterialHelper.PrepareDefinesForMisc(e,o,!1,this.pointsCloud,this.fogEnabled,!1,i),l.MaterialHelper.PrepareDefinesForAttributes(e,i,!0,!1),i.isDirty){i.markAsProcessed(),o.resetCachedMaterial();var a=new l.EffectFallbacks;i.FOG&&a.addFallback(1,"FOG");var r=[l.VertexBuffer.PositionKind];i.VERTEXCOLOR&&r.push(l.VertexBuffer.ColorKind);var c=i.toString();t.setEffect(o.getEngine().createEffect("sky",r,["world","viewProjection","view","vFogInfos","vFogColor","pointSize","vClipPlane","vClipPlane2","vClipPlane3","vClipPlane4","luminance","turbidity","rayleigh","mieCoefficient","mieDirectionalG","sunPosition","cameraPosition"],[],c,a,this.onCompiled,this.onError),i)}return!(!t.effect||!t.effect.isReady())&&(this._renderId=o.getRenderId(),this._wasPreviouslyReady=!0)},o.prototype.bindForSubMesh=function(e,t,n){var i=this.getScene();if(n._materialDefines){var o=n.effect;if(o){this._activeEffect=o,this.bindOnlyWorldMatrix(e),this._activeEffect.setMatrix("viewProjection",i.getTransformMatrix()),this._mustRebind(i,o)&&(l.MaterialHelper.BindClipPlane(this._activeEffect,i),this.pointsCloud&&this._activeEffect.setFloat("pointSize",this.pointSize)),i.fogEnabled&&t.applyFog&&i.fogMode!==l.Scene.FOGMODE_NONE&&this._activeEffect.setMatrix("view",i.getViewMatrix()),l.MaterialHelper.BindFogParameters(i,t,this._activeEffect);var a=i.activeCamera;if(a){var r=a.getWorldMatrix();this._cameraPosition.x=r.m[12],this._cameraPosition.y=r.m[13],this._cameraPosition.z=r.m[14],this._activeEffect.setVector3("cameraPosition",this._cameraPosition)}if(0<this.luminance&&this._activeEffect.setFloat("luminance",this.luminance),this._activeEffect.setFloat("turbidity",this.turbidity),this._activeEffect.setFloat("rayleigh",this.rayleigh),this._activeEffect.setFloat("mieCoefficient",this.mieCoefficient),this._activeEffect.setFloat("mieDirectionalG",this.mieDirectionalG),!this.useSunPosition){var c=Math.PI*(this.inclination-.5),s=2*Math.PI*(this.azimuth-.5);this.sunPosition.x=this.distance*Math.cos(s),this.sunPosition.y=this.distance*Math.sin(s)*Math.sin(c),this.sunPosition.z=this.distance*Math.sin(s)*Math.cos(c)}this._activeEffect.setVector3("sunPosition",this.sunPosition),this._afterBind(t,this._activeEffect)}}},o.prototype.getAnimatables=function(){return[]},o.prototype.dispose=function(e){i.prototype.dispose.call(this,e)},o.prototype.clone=function(e){var t=this;return l.SerializationHelper.Clone((function(){return new o(e,t.getScene())}),this)},o.prototype.serialize=function(){var e=l.SerializationHelper.Serialize(this);return e.customType="BABYLON.SkyMaterial",e},o.prototype.getClassName=function(){return"SkyMaterial"},o.Parse=function(e,t,n){return l.SerializationHelper.Parse((function(){return new o(e.name,t)}),e,t,n)},__decorate([l.serialize()],o.prototype,"luminance",void 0),__decorate([l.serialize()],o.prototype,"turbidity",void 0),__decorate([l.serialize()],o.prototype,"rayleigh",void 0),__decorate([l.serialize()],o.prototype,"mieCoefficient",void 0),__decorate([l.serialize()],o.prototype,"mieDirectionalG",void 0),__decorate([l.serialize()],o.prototype,"distance",void 0),__decorate([l.serialize()],o.prototype,"inclination",void 0),__decorate([l.serialize()],o.prototype,"azimuth",void 0),__decorate([l.serializeAsVector3()],o.prototype,"sunPosition",void 0),__decorate([l.serialize()],o.prototype,"useSunPosition",void 0),o})(l.PushMaterial);l.SkyMaterial=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.skyVertexShader="precision highp float;\n\nattribute vec3 position;\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n\nuniform mat4 world;\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\nvoid main(void) {\ngl_Position=viewProjection*world*vec4(position,1.0);\nvec4 worldPos=world*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n",BABYLON.Effect.ShadersStore.skyPixelShader="precision highp float;\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\nuniform vec3 cameraPosition;\nuniform float luminance;\nuniform float turbidity;\nuniform float rayleigh;\nuniform float mieCoefficient;\nuniform float mieDirectionalG;\nuniform vec3 sunPosition;\n\n#include<fogFragmentDeclaration>\n\nconst float e=2.71828182845904523536028747135266249775724709369995957;\nconst float pi=3.141592653589793238462643383279502884197169;\nconst float n=1.0003;\nconst float N=2.545E25;\nconst float pn=0.035;\nconst vec3 lambda=vec3(680E-9,550E-9,450E-9);\nconst vec3 K=vec3(0.686,0.678,0.666);\nconst float v=4.0;\nconst float rayleighZenithLength=8.4E3;\nconst float mieZenithLength=1.25E3;\nconst vec3 up=vec3(0.0,1.0,0.0);\nconst float EE=1000.0;\nconst float sunAngularDiameterCos=0.999956676946448443553574619906976478926848692873900859324;\nconst float cutoffAngle=pi/1.95;\nconst float steepness=1.5;\nvec3 totalRayleigh(vec3 lambda)\n{\nreturn (8.0*pow(pi,3.0)*pow(pow(n,2.0)-1.0,2.0)*(6.0+3.0*pn))/(3.0*N*pow(lambda,vec3(4.0))*(6.0-7.0*pn));\n}\nvec3 simplifiedRayleigh()\n{\nreturn 0.0005/vec3(94,40,18);\n}\nfloat rayleighPhase(float cosTheta)\n{ \nreturn (3.0/(16.0*pi))*(1.0+pow(cosTheta,2.0));\n}\nvec3 totalMie(vec3 lambda,vec3 K,float T)\n{\nfloat c=(0.2*T )*10E-18;\nreturn 0.434*c*pi*pow((2.0*pi)/lambda,vec3(v-2.0))*K;\n}\nfloat hgPhase(float cosTheta,float g)\n{\nreturn (1.0/(4.0*pi))*((1.0-pow(g,2.0))/pow(1.0-2.0*g*cosTheta+pow(g,2.0),1.5));\n}\nfloat sunIntensity(float zenithAngleCos)\n{\nreturn EE*max(0.0,1.0-exp((-(cutoffAngle-acos(zenithAngleCos))/steepness)));\n}\nfloat A=0.15;\nfloat B=0.50;\nfloat C=0.10;\nfloat D=0.20;\nfloat EEE=0.02;\nfloat F=0.30;\nfloat W=1000.0;\nvec3 Uncharted2Tonemap(vec3 x)\n{\nreturn ((x*(A*x+C*B)+D*EEE)/(x*(A*x+B)+D*F))-EEE/F;\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\n\nfloat sunfade=1.0-clamp(1.0-exp((sunPosition.y/450000.0)),0.0,1.0);\nfloat rayleighCoefficient=rayleigh-(1.0*(1.0-sunfade));\nvec3 sunDirection=normalize(sunPosition);\nfloat sunE=sunIntensity(dot(sunDirection,up));\nvec3 betaR=simplifiedRayleigh()*rayleighCoefficient;\nvec3 betaM=totalMie(lambda,K,turbidity)*mieCoefficient;\nfloat zenithAngle=acos(max(0.0,dot(up,normalize(vPositionW-cameraPosition))));\nfloat sR=rayleighZenithLength/(cos(zenithAngle)+0.15*pow(93.885-((zenithAngle*180.0)/pi),-1.253));\nfloat sM=mieZenithLength/(cos(zenithAngle)+0.15*pow(93.885-((zenithAngle*180.0)/pi),-1.253));\nvec3 Fex=exp(-(betaR*sR+betaM*sM));\nfloat cosTheta=dot(normalize(vPositionW-cameraPosition),sunDirection);\nfloat rPhase=rayleighPhase(cosTheta*0.5+0.5);\nvec3 betaRTheta=betaR*rPhase;\nfloat mPhase=hgPhase(cosTheta,mieDirectionalG);\nvec3 betaMTheta=betaM*mPhase;\nvec3 Lin=pow(sunE*((betaRTheta+betaMTheta)/(betaR+betaM))*(1.0-Fex),vec3(1.5));\nLin*=mix(vec3(1.0),pow(sunE*((betaRTheta+betaMTheta)/(betaR+betaM))*Fex,vec3(1.0/2.0)),clamp(pow(1.0-dot(up,sunDirection),5.0),0.0,1.0));\nvec3 direction=normalize(vPositionW-cameraPosition);\nfloat theta=acos(direction.y);\nfloat phi=atan(direction.z,direction.x);\nvec2 uv=vec2(phi,theta)/vec2(2.0*pi,pi)+vec2(0.5,0.0);\nvec3 L0=vec3(0.1)*Fex;\nfloat sundisk=smoothstep(sunAngularDiameterCos,sunAngularDiameterCos+0.00002,cosTheta);\nL0+=(sunE*19000.0*Fex)*sundisk;\nvec3 whiteScale=1.0/Uncharted2Tonemap(vec3(W));\nvec3 texColor=(Lin+L0); \ntexColor*=0.04 ;\ntexColor+=vec3(0.0,0.001,0.0025)*0.3;\nfloat g_fMaxLuminance=1.0;\nfloat fLumScaled=0.1/luminance; \nfloat fLumCompressed=(fLumScaled*(1.0+(fLumScaled/(g_fMaxLuminance*g_fMaxLuminance))))/(1.0+fLumScaled); \nfloat ExposureBias=fLumCompressed;\nvec3 curr=Uncharted2Tonemap((log2(2.0/pow(luminance,4.0)))*texColor);\n\n\n\nvec3 retColor=curr*whiteScale;\n\n\nfloat alpha=1.0;\n#ifdef VERTEXCOLOR\nretColor.rgb*=vColor.rgb;\n#endif\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n\nvec4 color=clamp(vec4(retColor.rgb,alpha),0.0,1.0);\n\n#include<fogFragment>\ngl_FragColor=color;\n}\n";

var BABYLON,__extends=this&&this.__extends||(function(){var o=function(e,r){return(o=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,r){e.__proto__=r}||function(e,r){for(var t in r)r.hasOwnProperty(t)&&(e[t]=r[t])})(e,r)};return function(e,r){function t(){this.constructor=e}o(e,r),e.prototype=null===r?Object.create(r):(t.prototype=r.prototype,new t)}})(),__decorate=this&&this.__decorate||function(e,r,t,o){var n,i=arguments.length,c=i<3?r:null===o?o=Object.getOwnPropertyDescriptor(r,t):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)c=Reflect.decorate(e,r,t,o);else for(var l=e.length-1;0<=l;l--)(n=e[l])&&(c=(i<3?n(c):3<i?n(r,t,c):n(r,t))||c);return 3<i&&c&&Object.defineProperty(r,t,c),c};!(function(l){var e=(function(c){function o(e,r,t,o,n){var i=c.call(this,e,r,"brickProceduralTexture",t,o,n)||this;return i._numberOfBricksHeight=15,i._numberOfBricksWidth=5,i._jointColor=new l.Color3(.72,.72,.72),i._brickColor=new l.Color3(.77,.47,.4),i.updateShaderUniforms(),i}return __extends(o,c),o.prototype.updateShaderUniforms=function(){this.setFloat("numberOfBricksHeight",this._numberOfBricksHeight),this.setFloat("numberOfBricksWidth",this._numberOfBricksWidth),this.setColor3("brickColor",this._brickColor),this.setColor3("jointColor",this._jointColor)},Object.defineProperty(o.prototype,"numberOfBricksHeight",{get:function(){return this._numberOfBricksHeight},set:function(e){this._numberOfBricksHeight=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"numberOfBricksWidth",{get:function(){return this._numberOfBricksWidth},set:function(e){this._numberOfBricksWidth=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"jointColor",{get:function(){return this._jointColor},set:function(e){this._jointColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"brickColor",{get:function(){return this._brickColor},set:function(e){this._brickColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),o.prototype.serialize=function(){var e=l.SerializationHelper.Serialize(this,c.prototype.serialize.call(this));return e.customType="BABYLON.BrickProceduralTexture",e},o.Parse=function(e,r,t){return l.SerializationHelper.Parse((function(){return new o(e.name,e._size,r,void 0,e._generateMipMaps)}),e,r,t)},__decorate([l.serialize()],o.prototype,"numberOfBricksHeight",null),__decorate([l.serialize()],o.prototype,"numberOfBricksWidth",null),__decorate([l.serializeAsColor3()],o.prototype,"jointColor",null),__decorate([l.serializeAsColor3()],o.prototype,"brickColor",null),o})(l.ProceduralTexture);l.BrickProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.brickProceduralTexturePixelShader="precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float numberOfBricksHeight;\nuniform float numberOfBricksWidth;\nuniform vec3 brickColor;\nuniform vec3 jointColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nfloat roundF(float number){\nreturn sign(number)*floor(abs(number)+0.5);\n}\nvoid main(void)\n{\nfloat brickW=1.0/numberOfBricksWidth;\nfloat brickH=1.0/numberOfBricksHeight;\nfloat jointWPercentage=0.01;\nfloat jointHPercentage=0.05;\nvec3 color=brickColor;\nfloat yi=vUV.y/brickH;\nfloat nyi=roundF(yi);\nfloat xi=vUV.x/brickW;\nif (mod(floor(yi),2.0) == 0.0){\nxi=xi-0.5;\n}\nfloat nxi=roundF(xi);\nvec2 brickvUV=vec2((xi-floor(xi))/brickH,(yi-floor(yi))/brickW);\nif (yi<nyi+jointHPercentage && yi>nyi-jointHPercentage){\ncolor=mix(jointColor,vec3(0.37,0.25,0.25),(yi-nyi)/jointHPercentage+0.2);\n}\nelse if (xi<nxi+jointWPercentage && xi>nxi-jointWPercentage){\ncolor=mix(jointColor,vec3(0.44,0.44,0.44),(xi-nxi)/jointWPercentage+0.2);\n}\nelse {\nfloat brickColorSwitch=mod(floor(yi)+floor(xi),3.0);\nif (brickColorSwitch == 0.0)\ncolor=mix(color,vec3(0.33,0.33,0.33),0.3);\nelse if (brickColorSwitch == 2.0)\ncolor=mix(color,vec3(0.11,0.11,0.11),0.3);\n}\ngl_FragColor=vec4(color,1.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,o){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,o){e.__proto__=o}||function(e,o){for(var r in o)o.hasOwnProperty(r)&&(e[r]=o[r])})(e,o)};return function(e,o){function r(){this.constructor=e}t(e,o),e.prototype=null===o?Object.create(o):(r.prototype=o.prototype,new r)}})(),__decorate=this&&this.__decorate||function(e,o,r,t){var n,i=arguments.length,l=i<3?o:null===t?t=Object.getOwnPropertyDescriptor(o,r):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,o,r,t);else for(var c=e.length-1;0<=c;c--)(n=e[c])&&(l=(i<3?n(l):3<i?n(o,r,l):n(o,r))||l);return 3<i&&l&&Object.defineProperty(o,r,l),l};!(function(c){var e=(function(l){function t(e,o,r,t,n){var i=l.call(this,e,o,"cloudProceduralTexture",r,t,n)||this;return i._skyColor=new c.Color4(.15,.68,1,1),i._cloudColor=new c.Color4(1,1,1,1),i.updateShaderUniforms(),i}return __extends(t,l),t.prototype.updateShaderUniforms=function(){this.setColor4("skyColor",this._skyColor),this.setColor4("cloudColor",this._cloudColor)},Object.defineProperty(t.prototype,"skyColor",{get:function(){return this._skyColor},set:function(e){this._skyColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"cloudColor",{get:function(){return this._cloudColor},set:function(e){this._cloudColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),t.prototype.serialize=function(){var e=c.SerializationHelper.Serialize(this,l.prototype.serialize.call(this));return e.customType="BABYLON.CloudProceduralTexture",e},t.Parse=function(e,o,r){return c.SerializationHelper.Parse((function(){return new t(e.name,e._size,o,void 0,e._generateMipMaps)}),e,o,r)},__decorate([c.serializeAsColor4()],t.prototype,"skyColor",null),__decorate([c.serializeAsColor4()],t.prototype,"cloudColor",null),t})(c.ProceduralTexture);c.CloudProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.cloudProceduralTexturePixelShader="precision highp float;\nvarying vec2 vUV;\nuniform vec4 skyColor;\nuniform vec4 cloudColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main() {\nvec2 p=vUV*12.0;\nvec4 c=mix(skyColor,cloudColor,fbm(p));\ngl_FragColor=c;\n}\n";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,r){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,r){e.__proto__=r}||function(e,r){for(var o in r)r.hasOwnProperty(o)&&(e[o]=r[o])})(e,r)};return function(e,r){function o(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(o.prototype=r.prototype,new o)}})(),__decorate=this&&this.__decorate||function(e,r,o,t){var n,i=arguments.length,l=i<3?r:null===t?t=Object.getOwnPropertyDescriptor(r,o):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,r,o,t);else for(var a=e.length-1;0<=a;a--)(n=e[a])&&(l=(i<3?n(l):3<i?n(r,o,l):n(r,o))||l);return 3<i&&l&&Object.defineProperty(r,o,l),l};!(function(s){var e=(function(l){function a(e,r,o,t,n){var i=l.call(this,e,r,"fireProceduralTexture",o,t,n)||this;return i._time=0,i._speed=new s.Vector2(.5,.3),i._autoGenerateTime=!0,i._alphaThreshold=.5,i._fireColors=a.RedFireColors,i.updateShaderUniforms(),i}return __extends(a,l),a.prototype.updateShaderUniforms=function(){this.setFloat("time",this._time),this.setVector2("speed",this._speed),this.setColor3("c1",this._fireColors[0]),this.setColor3("c2",this._fireColors[1]),this.setColor3("c3",this._fireColors[2]),this.setColor3("c4",this._fireColors[3]),this.setColor3("c5",this._fireColors[4]),this.setColor3("c6",this._fireColors[5]),this.setFloat("alphaThreshold",this._alphaThreshold)},a.prototype.render=function(e){var r=this.getScene();this._autoGenerateTime&&r&&(this._time+=.03*r.getAnimationRatio(),this.updateShaderUniforms()),l.prototype.render.call(this,e)},Object.defineProperty(a,"PurpleFireColors",{get:function(){return[new s.Color3(.5,0,1),new s.Color3(.9,0,1),new s.Color3(.2,0,1),new s.Color3(1,.9,1),new s.Color3(.1,.1,1),new s.Color3(.9,.9,1)]},enumerable:!0,configurable:!0}),Object.defineProperty(a,"GreenFireColors",{get:function(){return[new s.Color3(.5,1,0),new s.Color3(.5,1,0),new s.Color3(.3,.4,0),new s.Color3(.5,1,0),new s.Color3(.2,0,0),new s.Color3(.5,1,0)]},enumerable:!0,configurable:!0}),Object.defineProperty(a,"RedFireColors",{get:function(){return[new s.Color3(.5,0,.1),new s.Color3(.9,0,0),new s.Color3(.2,0,0),new s.Color3(1,.9,0),new s.Color3(.1,.1,.1),new s.Color3(.9,.9,.9)]},enumerable:!0,configurable:!0}),Object.defineProperty(a,"BlueFireColors",{get:function(){return[new s.Color3(.1,0,.5),new s.Color3(0,0,.5),new s.Color3(.1,0,.2),new s.Color3(0,0,1),new s.Color3(.1,.2,.3),new s.Color3(0,.2,.9)]},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"autoGenerateTime",{get:function(){return this._autoGenerateTime},set:function(e){this._autoGenerateTime=e},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"fireColors",{get:function(){return this._fireColors},set:function(e){this._fireColors=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"time",{get:function(){return this._time},set:function(e){this._time=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"speed",{get:function(){return this._speed},set:function(e){this._speed=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(a.prototype,"alphaThreshold",{get:function(){return this._alphaThreshold},set:function(e){this._alphaThreshold=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),a.prototype.serialize=function(){var e=s.SerializationHelper.Serialize(this,l.prototype.serialize.call(this));e.customType="BABYLON.FireProceduralTexture",e.fireColors=[];for(var r=0;r<this._fireColors.length;r++)e.fireColors.push(this._fireColors[r].asArray());return e},a.Parse=function(e,r,o){for(var t=s.SerializationHelper.Parse((function(){return new a(e.name,e._size,r,void 0,e._generateMipMaps)}),e,r,o),n=[],i=0;i<e.fireColors.length;i++)n.push(s.Color3.FromArray(e.fireColors[i]));return t.fireColors=n,t},__decorate([s.serialize()],a.prototype,"autoGenerateTime",null),__decorate([s.serialize()],a.prototype,"time",null),__decorate([s.serializeAsVector2()],a.prototype,"speed",null),__decorate([s.serialize()],a.prototype,"alphaThreshold",null),a})(s.ProceduralTexture);s.FireProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.fireProceduralTexturePixelShader="precision highp float;\nuniform float time;\nuniform vec3 c1;\nuniform vec3 c2;\nuniform vec3 c3;\nuniform vec3 c4;\nuniform vec3 c5;\nuniform vec3 c6;\nuniform vec2 speed;\nuniform float shift;\nuniform float alphaThreshold;\nvarying vec2 vUV;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main() {\nvec2 p=vUV*8.0;\nfloat q=fbm(p-time*0.1);\nvec2 r=vec2(fbm(p+q+time*speed.x-p.x-p.y),fbm(p+q-time*speed.y));\nvec3 c=mix(c1,c2,fbm(p+r))+mix(c3,c4,r.x)-mix(c5,c6,r.y);\nvec3 color=c*cos(shift*vUV.y);\nfloat luminance=dot(color.rgb,vec3(0.3,0.59,0.11));\ngl_FragColor=vec4(color,luminance*alphaThreshold+(1.0-alphaThreshold));\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(r,o){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(r,o){r.__proto__=o}||function(r,o){for(var e in o)o.hasOwnProperty(e)&&(r[e]=o[e])})(r,o)};return function(r,o){function e(){this.constructor=r}t(r,o),r.prototype=null===o?Object.create(o):(e.prototype=o.prototype,new e)}})(),__decorate=this&&this.__decorate||function(r,o,e,t){var n,s=arguments.length,i=s<3?o:null===t?t=Object.getOwnPropertyDescriptor(o,e):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)i=Reflect.decorate(r,o,e,t);else for(var l=r.length-1;0<=l;l--)(n=r[l])&&(i=(s<3?n(i):3<s?n(o,e,i):n(o,e))||i);return 3<s&&i&&Object.defineProperty(o,e,i),i};!(function(a){var r=(function(i){function l(r,o,e,t,n){var s=i.call(this,r,o,"grassProceduralTexture",e,t,n)||this;return s._groundColor=new a.Color3(1,1,1),s._grassColors=[new a.Color3(.29,.38,.02),new a.Color3(.36,.49,.09),new a.Color3(.51,.6,.28)],s.updateShaderUniforms(),s}return __extends(l,i),l.prototype.updateShaderUniforms=function(){this.setColor3("herb1Color",this._grassColors[0]),this.setColor3("herb2Color",this._grassColors[1]),this.setColor3("herb3Color",this._grassColors[2]),this.setColor3("groundColor",this._groundColor)},Object.defineProperty(l.prototype,"grassColors",{get:function(){return this._grassColors},set:function(r){this._grassColors=r,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"groundColor",{get:function(){return this._groundColor},set:function(r){this._groundColor=r,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),l.prototype.serialize=function(){var r=a.SerializationHelper.Serialize(this,i.prototype.serialize.call(this));r.customType="BABYLON.GrassProceduralTexture",r.grassColors=[];for(var o=0;o<this._grassColors.length;o++)r.grassColors.push(this._grassColors[o].asArray());return r},l.Parse=function(r,o,e){for(var t=a.SerializationHelper.Parse((function(){return new l(r.name,r._size,o,void 0,r._generateMipMaps)}),r,o,e),n=[],s=0;s<r.grassColors.length;s++)n.push(a.Color3.FromArray(r.grassColors[s]));return t.grassColors=n,t},__decorate([a.serializeAsColor3()],l.prototype,"groundColor",null),l})(a.ProceduralTexture);a.GrassProceduralTexture=r})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.grassProceduralTexturePixelShader="precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform vec3 herb1Color;\nuniform vec3 herb2Color;\nuniform vec3 herb3Color;\nuniform vec3 groundColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nvec3 color=mix(groundColor,herb1Color,rand(gl_FragCoord.xy*4.0));\ncolor=mix(color,herb2Color,rand(gl_FragCoord.xy*8.0));\ncolor=mix(color,herb3Color,rand(gl_FragCoord.xy));\ncolor=mix(color,herb1Color,fbm(gl_FragCoord.xy*16.0));\ngl_FragColor=vec4(color,1.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)};return function(e,t){function n(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}})(),__decorate=this&&this.__decorate||function(e,t,n,r){var i,o=arguments.length,l=o<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,n):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;0<=a;a--)(i=e[a])&&(l=(o<3?i(l):3<o?i(t,n,l):i(t,n))||l);return 3<o&&l&&Object.defineProperty(t,n,l),l};!(function(a){var e=(function(l){function r(e,t,n,r,i){var o=l.call(this,e,t,"marbleProceduralTexture",n,r,i)||this;return o._numberOfTilesHeight=3,o._numberOfTilesWidth=3,o._amplitude=9,o._jointColor=new a.Color3(.72,.72,.72),o.updateShaderUniforms(),o}return __extends(r,l),r.prototype.updateShaderUniforms=function(){this.setFloat("numberOfTilesHeight",this._numberOfTilesHeight),this.setFloat("numberOfTilesWidth",this._numberOfTilesWidth),this.setFloat("amplitude",this._amplitude),this.setColor3("jointColor",this._jointColor)},Object.defineProperty(r.prototype,"numberOfTilesHeight",{get:function(){return this._numberOfTilesHeight},set:function(e){this._numberOfTilesHeight=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"amplitude",{get:function(){return this._amplitude},set:function(e){this._amplitude=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"numberOfTilesWidth",{get:function(){return this._numberOfTilesWidth},set:function(e){this._numberOfTilesWidth=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"jointColor",{get:function(){return this._jointColor},set:function(e){this._jointColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),r.prototype.serialize=function(){var e=a.SerializationHelper.Serialize(this,l.prototype.serialize.call(this));return e.customType="BABYLON.MarbleProceduralTexture",e},r.Parse=function(e,t,n){return a.SerializationHelper.Parse((function(){return new r(e.name,e._size,t,void 0,e._generateMipMaps)}),e,t,n)},__decorate([a.serialize()],r.prototype,"numberOfTilesHeight",null),__decorate([a.serialize()],r.prototype,"amplitude",null),__decorate([a.serialize()],r.prototype,"numberOfTilesWidth",null),__decorate([a.serialize()],r.prototype,"jointColor",null),r})(a.ProceduralTexture);a.MarbleProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.marbleProceduralTexturePixelShader="precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float numberOfTilesHeight;\nuniform float numberOfTilesWidth;\nuniform float amplitude;\nuniform vec3 marbleColor;\nuniform vec3 jointColor;\nconst vec3 tileSize=vec3(1.1,1.0,1.1);\nconst vec3 tilePct=vec3(0.98,1.0,0.98);\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat turbulence(vec2 P)\n{\nfloat val=0.0;\nfloat freq=1.0;\nfor (int i=0; i<4; i++)\n{\nval+=abs(noise(P*freq)/freq);\nfreq*=2.07;\n}\nreturn val;\n}\nfloat roundF(float number){\nreturn sign(number)*floor(abs(number)+0.5);\n}\nvec3 marble_color(float x)\n{\nvec3 col;\nx=0.5*(x+1.);\nx=sqrt(x); \nx=sqrt(x);\nx=sqrt(x);\ncol=vec3(.2+.75*x); \ncol.b*=0.95; \nreturn col;\n}\nvoid main()\n{\nfloat brickW=1.0/numberOfTilesWidth;\nfloat brickH=1.0/numberOfTilesHeight;\nfloat jointWPercentage=0.01;\nfloat jointHPercentage=0.01;\nvec3 color=marbleColor;\nfloat yi=vUV.y/brickH;\nfloat nyi=roundF(yi);\nfloat xi=vUV.x/brickW;\nif (mod(floor(yi),2.0) == 0.0){\nxi=xi-0.5;\n}\nfloat nxi=roundF(xi);\nvec2 brickvUV=vec2((xi-floor(xi))/brickH,(yi-floor(yi))/brickW);\nif (yi<nyi+jointHPercentage && yi>nyi-jointHPercentage){\ncolor=mix(jointColor,vec3(0.37,0.25,0.25),(yi-nyi)/jointHPercentage+0.2);\n}\nelse if (xi<nxi+jointWPercentage && xi>nxi-jointWPercentage){\ncolor=mix(jointColor,vec3(0.44,0.44,0.44),(xi-nxi)/jointWPercentage+0.2);\n}\nelse {\nfloat t=6.28*brickvUV.x/(tileSize.x+noise(vec2(vUV)*6.0));\nt+=amplitude*turbulence(brickvUV.xy);\nt=sin(t);\ncolor=marble_color(t);\n}\ngl_FragColor=vec4(color,0.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var t=function(e,r){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,r){e.__proto__=r}||function(e,r){for(var o in r)r.hasOwnProperty(o)&&(e[o]=r[o])})(e,r)};return function(e,r){function o(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(o.prototype=r.prototype,new o)}})(),__decorate=this&&this.__decorate||function(e,r,o,t){var n,a=arguments.length,i=a<3?r:null===t?t=Object.getOwnPropertyDescriptor(r,o):t;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)i=Reflect.decorate(e,r,o,t);else for(var c=e.length-1;0<=c;c--)(n=e[c])&&(i=(a<3?n(i):3<a?n(r,o,i):n(r,o))||i);return 3<a&&i&&Object.defineProperty(r,o,i),i};!(function(c){var e=(function(i){function t(e,r,o,t,n){var a=i.call(this,e,r,"roadProceduralTexture",o,t,n)||this;return a._roadColor=new c.Color3(.53,.53,.53),a.updateShaderUniforms(),a}return __extends(t,i),t.prototype.updateShaderUniforms=function(){this.setColor3("roadColor",this._roadColor)},Object.defineProperty(t.prototype,"roadColor",{get:function(){return this._roadColor},set:function(e){this._roadColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),t.prototype.serialize=function(){var e=c.SerializationHelper.Serialize(this,i.prototype.serialize.call(this));return e.customType="BABYLON.RoadProceduralTexture",e},t.Parse=function(e,r,o){return c.SerializationHelper.Parse((function(){return new t(e.name,e._size,r,void 0,e._generateMipMaps)}),e,r,o)},__decorate([c.serializeAsColor3()],t.prototype,"roadColor",null),t})(c.ProceduralTexture);c.RoadProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.roadProceduralTexturePixelShader="precision highp float;\nvarying vec2 vUV; \nuniform vec3 roadColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nfloat ratioy=mod(gl_FragCoord.y*100.0 ,fbm(vUV*2.0));\nvec3 color=roadColor*ratioy;\ngl_FragColor=vec4(color,1.0);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var i=function(t,e){return(i=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(t,e)};return function(t,e){function r(){this.constructor=t}i(t,e),t.prototype=null===e?Object.create(e):(r.prototype=e.prototype,new r)}})(),__decorate=this&&this.__decorate||function(t,e,r,i){var n,o=arguments.length,a=o<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,r,i);else for(var s=t.length-1;0<=s;s--)(n=t[s])&&(a=(o<3?n(a):3<o?n(e,r,a):n(e,r))||a);return 3<o&&a&&Object.defineProperty(e,r,a),a};!(function(n){var t=(function(a){function i(t,e,r,i,n){var o=a.call(this,t,e,"starfieldProceduralTexture",r,i,n)||this;return o._time=1,o._alpha=.5,o._beta=.8,o._zoom=.8,o._formuparam=.53,o._stepsize=.1,o._tile=.85,o._brightness=.0015,o._darkmatter=.4,o._distfading=.73,o._saturation=.85,o.updateShaderUniforms(),o}return __extends(i,a),i.prototype.updateShaderUniforms=function(){this.setFloat("time",this._time),this.setFloat("alpha",this._alpha),this.setFloat("beta",this._beta),this.setFloat("zoom",this._zoom),this.setFloat("formuparam",this._formuparam),this.setFloat("stepsize",this._stepsize),this.setFloat("tile",this._tile),this.setFloat("brightness",this._brightness),this.setFloat("darkmatter",this._darkmatter),this.setFloat("distfading",this._distfading),this.setFloat("saturation",this._saturation)},Object.defineProperty(i.prototype,"time",{get:function(){return this._time},set:function(t){this._time=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"alpha",{get:function(){return this._alpha},set:function(t){this._alpha=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"beta",{get:function(){return this._beta},set:function(t){this._beta=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"formuparam",{get:function(){return this._formuparam},set:function(t){this._formuparam=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"stepsize",{get:function(){return this._stepsize},set:function(t){this._stepsize=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"zoom",{get:function(){return this._zoom},set:function(t){this._zoom=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"tile",{get:function(){return this._tile},set:function(t){this._tile=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"brightness",{get:function(){return this._brightness},set:function(t){this._brightness=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"darkmatter",{get:function(){return this._darkmatter},set:function(t){this._darkmatter=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"distfading",{get:function(){return this._distfading},set:function(t){this._distfading=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"saturation",{get:function(){return this._saturation},set:function(t){this._saturation=t,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),i.prototype.serialize=function(){var t=n.SerializationHelper.Serialize(this,a.prototype.serialize.call(this));return t.customType="BABYLON.StarfieldProceduralTexture",t},i.Parse=function(t,e,r){return n.SerializationHelper.Parse((function(){return new i(t.name,t._size,e,void 0,t._generateMipMaps)}),t,e,r)},__decorate([n.serialize()],i.prototype,"time",null),__decorate([n.serialize()],i.prototype,"alpha",null),__decorate([n.serialize()],i.prototype,"beta",null),__decorate([n.serialize()],i.prototype,"formuparam",null),__decorate([n.serialize()],i.prototype,"stepsize",null),__decorate([n.serialize()],i.prototype,"zoom",null),__decorate([n.serialize()],i.prototype,"tile",null),__decorate([n.serialize()],i.prototype,"brightness",null),__decorate([n.serialize()],i.prototype,"darkmatter",null),__decorate([n.serialize()],i.prototype,"distfading",null),__decorate([n.serialize()],i.prototype,"saturation",null),i})(n.ProceduralTexture);n.StarfieldProceduralTexture=t})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.starfieldProceduralTexturePixelShader="precision highp float;\n\n#define volsteps 20\n#define iterations 15\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float time;\nuniform float alpha;\nuniform float beta;\nuniform float zoom;\nuniform float formuparam;\nuniform float stepsize;\nuniform float tile;\nuniform float brightness;\nuniform float darkmatter;\nuniform float distfading;\nuniform float saturation;\nvoid main()\n{\nvec3 dir=vec3(vUV*zoom,1.);\nfloat localTime=time*0.0001;\n\nmat2 rot1=mat2(cos(alpha),sin(alpha),-sin(alpha),cos(alpha));\nmat2 rot2=mat2(cos(beta),sin(beta),-sin(beta),cos(beta));\ndir.xz*=rot1;\ndir.xy*=rot2;\nvec3 from=vec3(1.,.5,0.5);\nfrom+=vec3(-2.,localTime*2.,localTime);\nfrom.xz*=rot1;\nfrom.xy*=rot2;\n\nfloat s=0.1,fade=1.;\nvec3 v=vec3(0.);\nfor (int r=0; r<volsteps; r++) {\nvec3 p=from+s*dir*.5;\np=abs(vec3(tile)-mod(p,vec3(tile*2.))); \nfloat pa,a=pa=0.;\nfor (int i=0; i<iterations; i++) {\np=abs(p)/dot(p,p)-formuparam; \na+=abs(length(p)-pa); \npa=length(p);\n}\nfloat dm=max(0.,darkmatter-a*a*.001); \na*=a*a; \nif (r>6) fade*=1.-dm; \n\nv+=fade;\nv+=vec3(s,s*s,s*s*s*s)*a*brightness*fade; \nfade*=distfading; \ns+=stepsize;\n}\nv=mix(vec3(length(v)),v,saturation); \ngl_FragColor=vec4(v*.01,1.);\n}";

var BABYLON,__extends=this&&this.__extends||(function(){var r=function(e,o){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,o){e.__proto__=o}||function(e,o){for(var t in o)o.hasOwnProperty(t)&&(e[t]=o[t])})(e,o)};return function(e,o){function t(){this.constructor=e}r(e,o),e.prototype=null===o?Object.create(o):(t.prototype=o.prototype,new t)}})(),__decorate=this&&this.__decorate||function(e,o,t,r){var n,a=arguments.length,i=a<3?o:null===r?r=Object.getOwnPropertyDescriptor(o,t):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)i=Reflect.decorate(e,o,t,r);else for(var c=e.length-1;0<=c;c--)(n=e[c])&&(i=(a<3?n(i):3<a?n(o,t,i):n(o,t))||i);return 3<a&&i&&Object.defineProperty(o,t,i),i};!(function(c){var e=(function(i){function r(e,o,t,r,n){var a=i.call(this,e,o,"woodProceduralTexture",t,r,n)||this;return a._ampScale=100,a._woodColor=new c.Color3(.32,.17,.09),a.updateShaderUniforms(),a}return __extends(r,i),r.prototype.updateShaderUniforms=function(){this.setFloat("ampScale",this._ampScale),this.setColor3("woodColor",this._woodColor)},Object.defineProperty(r.prototype,"ampScale",{get:function(){return this._ampScale},set:function(e){this._ampScale=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"woodColor",{get:function(){return this._woodColor},set:function(e){this._woodColor=e,this.updateShaderUniforms()},enumerable:!0,configurable:!0}),r.prototype.serialize=function(){var e=c.SerializationHelper.Serialize(this,i.prototype.serialize.call(this));return e.customType="BABYLON.WoodProceduralTexture",e},r.Parse=function(e,o,t){return c.SerializationHelper.Parse((function(){return new r(e.name,e._size,o,void 0,e._generateMipMaps)}),e,o,t)},__decorate([c.serialize()],r.prototype,"ampScale",null),__decorate([c.serializeAsColor3()],r.prototype,"woodColor",null),r})(c.ProceduralTexture);c.WoodProceduralTexture=e})(BABYLON||(BABYLON={})),BABYLON.Effect.ShadersStore.woodProceduralTexturePixelShader="precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float ampScale;\nuniform vec3 woodColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nfloat ratioy=mod(vUV.x*ampScale,2.0+fbm(vUV*0.8));\nvec3 wood=woodColor*ratioy;\ngl_FragColor=vec4(wood,1.0);\n}";