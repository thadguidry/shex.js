// shex-simple - Simple ShEx2 validator for HTML.
// Copyright 2016 Eric Prud'hommeux
// Release under MIT License.

const START_SHAPE_LABEL = "- start -";

function sum (s) { // cheap way to identify identical strings
  return s.replace(/\s/g, "").split("").reduce(function (a,b){
    a = ((a<<5) - a) + b.charCodeAt(0);
    return a&a
  },0);
}

function load (selector, obj, func, listItems, side, str) {
  $(selector).empty();
  Object.keys(obj).forEach(k => {
    var li = $('<li><a href="#">' + k + '</li>');
    li.on("click", () => {
      func(k, obj[k], li, listItems, side);
    });
    listItems[side][sum(str(obj[k]))] = li;
    $(selector).append(li);
  });
}

function clearData () {debugger;
  $("#data textarea").val("");
  $("#data .status").text(" ");
  $("#results").text("").removeClass("passes fails error");
}

function clearAll () {
  $("#schema textarea").val("");
  $("#schema .status").text(" ");
  $("#schema li.selected").removeClass("selected");
  clearData();
  $("#data .passes, #data .fails").hide();
  $("#data .passes p:first").text("");
  $("#data .fails p:first").text("");
  $("#data .passes ul, #data .fails ul").empty();
}

function pickSchema (name, schemaTest, elt, listItems, side) {
  if ($(elt).hasClass("selected")) {
    clearAll();
  } else {
    $("#schema textarea").val(schemaTest.schema);
    $("#schema .status").text(name);

    $("#meta textarea").val(schemaTest.meta);

    $("#data textarea").val("");
    $("#data .status").text(" ");
    $("#data .passes, #data .fails").show();
    $("#data .passes p:first").text("Passing:");
    load("#data .passes ul", schemaTest.passes, pickData, listItems, "data", function (o) { return o.data; });
    $("#data .fails p:first").text("Failing:");
    load("#data .fails ul", schemaTest.fails, pickData, listItems, "data", function (o) { return o.data; });

    $("#results").text("").removeClass("passes fails error");
    $("#schema li.selected").removeClass("selected");
    $(elt).addClass("selected");
    $("input.schema").val(getSchemaShapes()[0]);
  }
}

function pickData (name, dataTest, elt, listItems, side) {
  if ($(elt).hasClass("selected")) {
    clearData();
    $(elt).removeClass("selected");
  } else {
    $("#data textarea").val(dataTest.data);
    $("#data .status").text(name);
    $("#data li.selected").removeClass("selected");
    $(elt).addClass("selected");
    //    $("input.data").val(getDataNodes()[0]);
    $("input.shape").val(dataTest.shape);
    $("input.data").val(dataTest.focus);

    // validate();
  }
}

var Base = "http://a.example/"; // window.location.href;
var shexParser = ShExParser.construct(Base);

function validate () {
  try {
    var schemaText = $("#schema textarea").val();
    var schemaIsJSON = schemaText.match(/^\S*\{/m);
    var resolverText = $("#meta textarea").val();
    if (resolverText) {
      var resolverStore = N3Store();
      resolverStore.addTriples(N3Parser({documentIRI:Base}).parse(resolverText));
      shexParser._setTermResolver({
        _db: resolverStore,
        _lookFor: [],
        add: function (iri) {
          this._lookFor.push(iri);
        },
        resolve: function (label) {
          for (var i = 0; i < this._lookFor.length; ++i) {
            var found = this._db.find(null, this._lookFor[i], label);
            if (found.length)
              return found[0].subject;
          }
          throw Error("no term found for `" + label + "`");
        }
      });
    } else {
      shexParser._setTermResolver({
        add: function (iri) {
          throw Error("no term resolver to accept <" + iri + ">");
        },
        resolve: function (label) {
          throw Error("no term resolver to resolve `" + label + "`");
        }
      });
    }
    var schema = schemaIsJSON ?
        JSON.parse(schemaText) :
        shexParser.parse(schemaText);
    var validator = ShExValidator.construct(schema);
    var dataText = $("#data textarea").val();
    if (dataText) {
      var data = N3Store();
      data.addTriples(N3Parser({documentIRI:Base}).parse(dataText));
      var focus = $("input.data").val();
      var shape = $("input.schema").val();
      if (shape === START_SHAPE_LABEL)
        shape = undefined;
      var ret = validator.validate(data, focus, shape);
      if ("errors" in ret)
        $("#results").text(JSON.stringify(ret, null, "  ")).
        removeClass("passes error").addClass("fails");
      else
        $("#results").text(JSON.stringify(ret, null, "  ")).
        removeClass("fails error").addClass("passes");
    } else {
      var parsedSchema;
      if (schemaIsJSON)
        new ShExWriter({simplifyParentheses: false}).writeSchema(schema, (error, text) => {
          if (error)
            $("#results").text("unwritable ShExJ schema:\n" + error).
            removeClass("passes").addClass("fails error");
          else
            $("#results").text("valid ShExJ schema:\n" + text).
            removeClass("fails error").addClass("passes");
        });
      else
        $("#results").text("valid ShExC schema:\n" + JSON.stringify(schema, null, "  ")).
        removeClass("fails error").addClass("passes");
    }
  } catch (e) {
    $("#results").text(e).
      removeClass("passes fails").addClass("error");
  }
}

function getSchemaShapes (entry) {
  var schemaText = $("#schema textarea").val();
  shexParser._setTermResolver({
    add: function (iri) {  },
    resolve: function (label) {
      return "http://a.example/vapidPredicate"
    }
  });
  var schema = shexParser.parse(schemaText);
  return ("start" in schema ? [START_SHAPE_LABEL] : []).
    concat(Object.keys(schema.shapes));
}

function getDataNodes () {
  var dataText = $("#data textarea").val();
  var data = N3Store();
  data.addTriples(N3Parser({documentIRI:Base}).parse(dataText));
  return data.find().map(t => {
    return t.subject;
  });
}

$("#data .passes, #data .fails").hide();
$("#data .passes ul, #data .fails ul").empty();
$("#validate").on("click", validate);
$("#clear").on("click", clearAll);
// prepareDemos() is invoked after these variables are assigned:
var clinicalObs;

function prepareDemos () {
  var demos = {
    "clinical observation": {
      schema: clinicalObs,
      passes: {
        "with birthdate": {
          data: clinicalObs_with_birthdate,
          focus: "http://a.example/Obs1",
          shape: "- start -"},
        "without birthdate": {
          data: clinicalObs_without_birthdate,
          focus: "http://a.example/Obs1",
          shape: "- start -" },
        "no subject name": {
          data: clinicalObs_no_subject_name,
          focus: "http://a.example/Obs1",
          shape: "- start -" }
      },
      fails: {
        "bad status": {
          data: clinicalObs_bad_status,
          focus: "http://a.example/Obs1",
          shape: "- start -" },
        "no subject": {
          data: clinicalObs_no_subject,
          focus: "http://a.example/Obs1",
          shape: "- start -" },
        "wrong birthdate datatype": {
          data: clinicalObs_birthdate_datatype,
          focus: "http://a.example/Obs1",
          shape: "- start -" }
      }
    },
    "protein record": {
      schema: proteinRecord,
      meta: proteinRecord_meta,
      passes: {
        "good": {
          data: proteinRecord_good,
          focus: "http://a.example/s",
          shape: "http://a.example/S"}
      },
      fails: {
        "bad label": {
          data: proteinRecord_badLabel,
          focus: "http://a.example/s",
          shape: "http://a.example/S" },
        "bad datatype": {
          data: proteinRecord_badDatatype,
          focus: "http://a.example/s",
          shape: "http://a.example/S" }
      }
    }
  };
  var listItems = {schema:{}, data:{}};
  load("#schema .examples ul", demos, pickSchema,
       listItems, "schema", function (o) {
         return o.schema;
       });
  var timeouts = { schema: undefined, data: undefined };
  function later (target, side) {
    if (timeouts[side])
      clearTimeout(timeouts[side]);

    timeouts[side] = setTimeout(() => {
      timeouts[side] = undefined;
      $("#"+side+" .selected").removeClass("selected");
      var curSum = sum($(target).val());
      if (curSum in listItems[side])
        listItems[side][curSum].addClass("selected");
    }, 250);
  }
  $("body").keydown(function (e) { // keydown because we need to preventDefault
    var code = e.keyCode || e.charCode;
    if (e.ctrlKey && (code === 10 || code === 13)) { // standards anyone?
      $("#validate").click();
      return false; // same as e.preventDefault();
    }
  });
  $("#schema textarea").keyup(function (e) { // keyup to capture backspace
    later(e.target, "schema");
  });
  $("#data textarea").keyup(function (e) {
    later(e.target, "data");
  });
  $("#meta textarea").keyup(function (e) {
    later(e.target, "meta");
  });
  [ { selector: ".schema",
      getItems: getSchemaShapes },
    { selector: ".data",
      schema: { "S1": {}, "S2": {} },
      getItems: getDataNodes },
    { selector: ".meta",
      schema: { "S1": {}, "S2": {} },
      getItems: function () { return []; } }
  ].forEach(entry => {
    $.contextMenu({
      selector: entry.selector,
      callback: function(key, options) {
        $("input" + options.selector).val(key);
      },
      build: function (elt, e) {
        return {
          items:
          entry.getItems(entry).reduce((ret, opt) => {
            ret[opt] = { name: opt };
            return ret;
          }, {})
        };
      }
    });
  });
}

// Large constants with demo data which break syntax highlighting:
clinicalObs = `PREFIX : <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

start = @<ObservationShape>

<ObservationShape> {               # An Observation has:
  :status ["preliminary" "final"]; #   status in this value set
  :subject @<PatientShape>         #   a subject matching <PatientShape>.
}

<PatientShape> {                   # A Patient has:
 :name xsd:string*;                #   one or more names
 :birthdate xsd:date?              #   and an optional birthdate.
}
`;
clinicalObs_with_birthdate = `PREFIX : <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

<Obs1>
  :status    "final" ;
  :subject   <Patient2> .

<Patient2>
  :name "Bob" ;
  :birthdate "1999-12-31"^^xsd:date .`;
clinicalObs_no_subject_name = `PREFIX : <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

<Obs1>
  :status    "final" ;
  :subject   <Patient2> .

<Patient2>
  :birthdate "1999-12-31"^^xsd:date .`;
clinicalObs_without_birthdate = `PREFIX : <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

<Obs1>
  :status    "preliminary" ;
  :subject   <Patient2> .

<Patient2>
  :name "Bob" .`;
clinicalObs_bad_status = `PREFIX : <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

<Obs1>
  :status    "finally" ;
  :subject   <Patient2> .

<Patient2>
  :name "Bob" ;
  :birthdate "1999-12-31"^^xsd:date .

`;
clinicalObs_no_subject = `PREFIX : <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

<Obs1>
  :status    "final" .

<Patient2>
  :name "Bob" ;
  :birthdate "1999-12-31"^^xsd:date .

`;
clinicalObs_birthdate_datatype = `PREFIX : <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

<Obs1>
  :status    "final" ;
  :subject   <Patient2> .

<Patient2>
  :name "Bob" ;
  :birthdate "1999-12-31T01:23:45"^^xsd:dateTime .`;

proteinRecord = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
LABEL [ rdfs:label skos:label ]
<S> {
  \`protein name\` LITERAL;
  \`protein type\` [ \`signaling\` \`regulatory\` \`transport\` ];
  \`protein width\` \`ucum microns\`
}`;
proteinRecord_meta = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX ex: <http://a.example/>

ex:protName rdfs:label "protein name" .
ex:protType skos:label "protein type" .
ex:Signaling rdfs:label "signaling" .
ex:Regulatory skos:label "regulatory" .
ex:Transport rdfs:label "transport" ; skos:label "transport" .
ex:protWidth rdfs:label "protein width" ; skos:label "protein width" .
ex:microns rdfs:label "ucum microns" .
`;
proteinRecord_good = `PREFIX ex: <http://a.example/>

<s>
  ex:protName "Dracula" ;
  ex:protType ex:Regulatory ;
  ex:protWidth "30"^^ex:microns .
`;
proteinRecord_badLabel = `PREFIX ex: <http://a.example/>

<s>
  ex:protName999 "Dracula" ;
  ex:protType ex:Regulatory ;
  ex:protWidth "30"^^ex:microns .
`;
proteinRecord_badDatatype = `PREFIX ex: <http://a.example/>

<s>
  ex:protName "Dracula" ;
  ex:protType ex:Regulatory ;
  ex:protWidth "30"^^ex:microns999 .
`;

prepareDemos();

