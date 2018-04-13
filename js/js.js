var map, params, incidentsGraphicsLayer, currLocation, watchId;
require([
    "dojo/dom",
    "dojo/_base/array",
    "esri/Color",
    "dojo/parser",
    "dijit/registry",
    "esri/urlUtils",
    "esri/map",
    "esri/lang",
    "esri/graphic",
    "esri/InfoTemplate",
    "esri/layers/GraphicsLayer",
    "esri/renderers/SimpleRenderer",
    "esri/geometry/Point",
    "esri/tasks/FeatureSet",
    "esri/tasks/ClosestFacilityTask",
    "esri/tasks/ClosestFacilityParameters",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dijit/form/ComboBox",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane"
  ],

  function(
    dom, array, Color, parser, registry,
    urlUtils, Map, esriLang, Graphic, InfoTemplate, GraphicsLayer, SimpleRenderer,
    Point, FeatureSet,
    ClosestFacilityTask, ClosestFacilityParameters,
    SimpleMarkerSymbol, SimpleLineSymbol
  ) {
    var routeGraphicLayer, closestFacilityTask;


    parser.parse(); //pARA LAS DIRECCIONES

    map = new Map("map", {
      basemap: "streets-navigation-vector",
      center: [-3.6022, 40.4606],
      zoom: 16,
      showInfoWindowOnClick: false
    });

    map.on("load", initFunc);
    map.on("click", mapClickHandler);


    //CONFIGURANDO LOS ClosestFacilityParameters:

    params = new ClosestFacilityParameters();
    params.impedenceAttribute = "Longitud";
    //params.defaultCutoff = 7.0;
    params.returnIncidents = false;
    params.returnRoutes = true;
    params.returnDirections = true;
    params.returnDirections = true;


    map.on("load", function(evtObj) {
      var map = evtObj.target;
      var salidasPointSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 20, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([89, 95, 35]), 2),
        new Color([130, 159, 83, 0.40])
      );


      routeGraphicLayer = new GraphicsLayer();
      var routePolylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([89, 95, 35]), 4.0);
      var routeRenderer = new SimpleRenderer(routePolylineSymbol);
      routeGraphicLayer.setRenderer(routeRenderer);
      map.addLayer(routeGraphicLayer);


      var salidasGL = new GraphicsLayer();
      var salidasRenderer = new SimpleRenderer(salidasPointSymbol);
      salidasGL.setRenderer(salidasRenderer);
      map.addLayer(salidasGL);
      salidasGL.add(new Graphic(new Point(-3.594275, 40.460355)));
      salidasGL.add(new Graphic(new Point(-3.604042, 40.454284)));
      salidasGL.add(new Graphic(new Point(-3.614730, 40.460159)));
      salidasGL.add(new Graphic(new Point(-3.614373, 40.46153)));
      salidasGL.add(new Graphic(new Point(-3.612203, 40.46392)));


      var salidas = new FeatureSet();
      salidas.features = salidasGL.graphics;
      params.facilities = salidas;
      params.outSpatialReference = map.spatialReference;

    });

    closestFacilityTask = new ClosestFacilityTask("https://localhost:6443/arcgis/rest/services/ClosestRoute/NAServer/Instalaci%C3%B3n%20m%C3%A1s%20cercana");

    registry.byId("numLocations").on("change", function() {
      params.defaultTargetFacilityCount = this.value;
      clearGraphics();
    });


    //Configuro geolocalización:

    function orientationChanged() {
      if (map) {
        map.reposition();
        map.resize();
      }
    }

    function initFunc(map) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(zoomToLocation, locationError);
        watchId = navigator.geolocation.watchPosition(showLocation, locationError);
      } else {
        alert("Tu navegador no soporta la geolocalización o no has otorgado permisos suficientes");
      }
    }

    function locationError(error) {

      if (navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      switch (error.code) {
        case error.PERMISSION_DENIED:
          alert("Localización denegada");
          break;

        case error.POSITION_UNAVAILABLE:
          alert("Localización actual no disponible");
          break;

        case error.TIMEOUT:
          alert("Timeout");
          break;

        default:
          alert("Error desconocido");
          break;
      }
    }

    function zoomToLocation(location) {
      var pt = new Point(location.coords.longitude, location.coords.latitude);
      addGraphic(pt);
      map.centerAndZoom(pt, 16);
    }

    function showLocation(location) {
      //zoom to the users location and add a graphic
      var pt = new Point(location.coords.longitude, location.coords.latitude);
      if (!graphic) {
        addGraphic(pt);
      } else { // move the graphic if it already exists
        graphic.setGeometry(pt);
      }
      map.centerAt(pt);
    }

    function addGraphic(pt) {
      var symbol = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        12,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([210, 105, 30, 0.5]),
          8
        ),
        new Color([210, 105, 30, 0.9])
      );
      graphic = new Graphic(pt, symbol);
      map.graphics.add(graphic);
    }

    /////ACABA


    function clearGraphics() {
      //clear graphics
      dom.byId("directionsDiv").innerHTML = "";
      map.graphics.clear();
      routeGraphicLayer.clear();

    }

    function mapClickHandler(evt) {
      clearGraphics();
      dom.byId("directionsDiv").innerHTML = "";
      map.graphics.add(graphic);


      var features = [];
      features.push(graphic);
      var incidents = new FeatureSet();
      incidents.features = features;
      params.incidents = incidents;

      map.graphics.enableMouseEvents();

      routeGraphicLayer.on("mouse-over", function(evt) {
        //clear existing directions and highlight symbol
        map.graphics.clear();
        dom.byId("directionsDiv").innerHTML = "Sitúa el ratón sobre la ruta para obtener las direcciones";

        var highlightSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255], 0.25), 4.5);
        var highlightGraphic = new Graphic(evt.graphic.geometry, highlightSymbol);

        map.graphics.add(highlightGraphic);
        dom.byId("directionsDiv").innerHTML = esriLang.substitute(evt.graphic.attributes, "${*}");
      });

      //Hago solveResult

      closestFacilityTask.solve(params, function(solveResult) {
        debugger;
        console.log(solveResult);
        array.forEach(solveResult.routes, function(route, index) {
          //build an array of route info
          var attr = array.map(solveResult.directions[index].features, function(feature) {
            return feature.attributes.text;
          });
          var infoTemplate = new InfoTemplate("Attributes", "${*}");

          route.setInfoTemplate(infoTemplate);
          route.setAttributes(attr);

          routeGraphicLayer.add(route);
          dom.byId("directionsDiv").innerHTML = "Posa el ratón sobre la ruta para ver las indicaciones";
        });

        //Muestra mensajes
        if (solveResult.messages.length > 0) {
          dom.byId("directionsDiv").innerHTML = "<b>Error:</b> " + solveResult.messages[0];
        }
      }, function(msg) {
        debugger;
        console.log(msg);
      });
    }
  });