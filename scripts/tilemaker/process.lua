-- process.lua — TrueRoute navigation tile schema
-- Outputs Protomaps-compatible layer names so the bundled protomaps-dark.json
-- style renders correctly in MapLibre without any style modifications.
--
-- Layer name mapping (Protomaps schema):
--   roads         ← transportation geometry + road labels (merged)
--   buildings     ← building polygons
--   places        ← place name nodes
--   pois          ← amenity / shop nodes and way centroids
--   boundaries    ← administrative boundary relations and ways
--   water         ← water body polygons          (unchanged)
--   waterway      ← river / canal lines          (unchanged — bonus layer)
--   landuse       ← landuse / natural polygons   (unchanged)
--   addr          ← address points               (app-specific, unchanged)
--   restriction   ← turn restriction relations   (app-specific, unchanged)

-- ============================================================================
-- Tag keys that trigger processing (tilemaker uses these to filter input)
-- ============================================================================

node_keys    = { "place", "natural", "amenity", "addr:housenumber", "shop" }
way_keys     = { "highway", "waterway", "natural", "landuse", "building", "boundary", "railway", "amenity" }
relation_keys= { "boundary", "type" }

-- ============================================================================
-- Maxspeed normalization (OSM string → integer km/h or nil)
-- ============================================================================
local function normalize_maxspeed(raw)
  if raw == "" then return nil end
  local num = tonumber(raw)
  if num then return math.floor(num) end
  local mph = raw:match("^(%d+)%s*mph$")
  if mph then return math.floor(tonumber(mph) * 1.609) end
  local kmh = raw:match("^(%d+)%s*km/?h$")
  if kmh then return math.floor(tonumber(kmh)) end
  return nil
end

-- ============================================================================
-- Oneway normalization (OSM string → 1 / -1 / 0)
-- ============================================================================
local function normalize_oneway(raw)
  if raw == "yes" or raw == "true" or raw == "1" then return 1
  elseif raw == "-1" or raw == "reverse" then return -1
  else return 0 end
end

-- ============================================================================
-- Highway class → Protomaps `kind` value
-- Protomaps dark style filters roads using these kind values:
--   highway     → motorway / trunk (and their link variants)
--   major_road  → primary / secondary (and link variants)
--   medium_road → tertiary
--   minor_road  → unclassified / residential / living_street / service
--   path        → cycleway / footway / path / pedestrian / steps / track
-- ============================================================================
local highway_kind = {
  motorway        = "highway",
  motorway_link   = "highway",
  trunk           = "highway",
  trunk_link      = "highway",
  primary         = "major_road",
  primary_link    = "major_road",
  secondary       = "major_road",
  secondary_link  = "major_road",
  tertiary        = "medium_road",
  tertiary_link   = "medium_road",
  unclassified    = "minor_road",
  residential     = "minor_road",
  living_street   = "minor_road",
  service         = "minor_road",
  track           = "path",
  path            = "path",
  cycleway        = "path",
  footway         = "path",
  pedestrian      = "path",
  steps           = "path",
  ferry           = "ferry",
}

-- Minimum zoom by Protomaps kind
local kind_minzoom = {
  highway    = 7,
  major_road = 9,
  medium_road= 11,
  minor_road = 11,
  path       = 14,
  ferry      = 10,
}

-- ============================================================================
-- POI classification: amenity/shop tag → { kind, minzoom }
-- kind values match Protomaps pois layer conventions used in the app style.
-- ============================================================================
local poi_amenity = {
  fuel             = { kind = "fuel",         minzoom = 12 },
  hospital         = { kind = "hospital",     minzoom = 11 },
  pharmacy         = { kind = "pharmacy",     minzoom = 13 },
  parking          = { kind = "parking",      minzoom = 14 },
  atm              = { kind = "atm",          minzoom = 14 },
  bank             = { kind = "atm",          minzoom = 14 },
  police           = { kind = "police",       minzoom = 12 },
  car_wash         = { kind = "car_wash",     minzoom = 14 },
  charging_station = { kind = "ev_charging",  minzoom = 13 },
}

local poi_shop = {
  supermarket      = { kind = "supermarket",  minzoom = 13 },
}

-- ============================================================================
-- Place → Protomaps kind + min_zoom
-- Protomaps dark style uses kind values: locality, neighbourhood, macrohood, etc.
-- ============================================================================
local place_kind = {
  city              = { kind = "locality",      minzoom = 5  },
  town              = { kind = "locality",      minzoom = 7  },
  village           = { kind = "locality",      minzoom = 9  },
  hamlet            = { kind = "locality",      minzoom = 10 },
  suburb            = { kind = "locality",      minzoom = 11 },
  neighbourhood     = { kind = "neighbourhood", minzoom = 12 },
  locality          = { kind = "locality",      minzoom = 13 },
  isolated_dwelling = { kind = "locality",      minzoom = 13 },
}

-- ============================================================================
-- Node processing
-- ============================================================================
function node_function(node)
  local place = node:Find("place")
  if place ~= "" then
    local pk = place_kind[place]
    if pk then
      node:Layer("places", false)
      node:Attribute("kind", pk.kind)
      node:Attribute("name", node:Find("name"))
      node:Attribute("name:uk", node:Find("name:uk"))
      node:Attribute("name:en", node:Find("name:en"))
      -- min_zoom used by Protomaps style for sort_key / label priority
      node:AttributeNumeric("min_zoom", pk.minzoom)
      node:MinZoom(pk.minzoom)
    end
    return
  end

  -- Address points (addr:housenumber nodes)
  local housenumber = node:Find("addr:housenumber")
  if housenumber ~= "" then
    node:Layer("addr", false)
    node:Attribute("housenumber", housenumber)
    local street = node:Find("addr:street")
    if street ~= "" then node:Attribute("street", street) end
    node:MinZoom(14)
    return
  end

  -- POI nodes (amenity and shop tags)
  local amenity = node:Find("amenity")
  local poi = poi_amenity[amenity]
  if not poi then
    local shop = node:Find("shop")
    poi = poi_shop[shop]
  end
  if poi then
    node:Layer("pois", false)
    node:Attribute("kind", poi.kind)
    local name = node:Find("name")
    if name ~= "" then node:Attribute("name", name) end
    local name_uk = node:Find("name:uk")
    if name_uk ~= "" then node:Attribute("name:uk", name_uk) end
    node:MinZoom(poi.minzoom)
    return
  end
end

-- ============================================================================
-- Way processing
-- ============================================================================
function way_function(way)
  local highway = way:Find("highway")
  local waterway = way:Find("waterway")
  local natural = way:Find("natural")
  local landuse = way:Find("landuse")
  local building = way:Find("building")
  local boundary = way:Find("boundary")
  local railway = way:Find("railway")

  -- Roads & paths
  if highway ~= "" then
    local kind = highway_kind[highway]
    if not kind then return end

    local minz = kind_minzoom[kind] or 14

    -- Roads layer (Protomaps schema name: "roads")
    way:Layer("roads", false)
    way:Attribute("kind", kind)

    -- Road name — included directly in the roads layer (Protomaps style renders
    -- labels from the same roads layer via text-field layout property)
    local name = way:Find("name")
    if name ~= "" then
      way:Attribute("name", name)
      way:Attribute("name:uk", way:Find("name:uk"))
    end

    -- Navigation attributes
    way:Attribute("surface", way:Find("surface"))
    way:Attribute("access", way:Find("access"))

    local ref = way:Find("ref")
    if ref ~= "" then way:Attribute("ref", ref) end

    local lanes = tonumber(way:Find("lanes"))
    if lanes then way:AttributeNumeric("lanes", lanes) end

    if way:Find("bridge") == "yes" then way:AttributeNumeric("bridge", 1) end
    if way:Find("tunnel") == "yes" then way:AttributeNumeric("tunnel", 1) end
    if way:Find("lit")    == "yes" then way:AttributeNumeric("lit",    1) end

    way:AttributeNumeric("oneway", normalize_oneway(way:Find("oneway")))

    local maxspeed = normalize_maxspeed(way:Find("maxspeed"))
    if maxspeed then way:AttributeNumeric("maxspeed", maxspeed) end

    way:MinZoom(minz)
    return
  end

  -- Railways (for context — kept in roads layer to render with transit styling)
  if railway == "rail" or railway == "light_rail" or railway == "subway" or railway == "tram" then
    way:Layer("roads", false)
    way:Attribute("kind", "rail")
    way:Attribute("subkind", railway)
    way:MinZoom(10)
    return
  end

  -- Waterways
  if waterway ~= "" then
    if waterway == "river" or waterway == "canal" or waterway == "stream" then
      way:Layer("waterway", true)
      way:Attribute("kind", waterway)
      way:Attribute("name", way:Find("name"))
      way:MinZoom(waterway == "river" and 9 or 12)
    end
    return
  end

  -- Water bodies
  if natural == "water" or natural == "bay" or natural == "coastline" then
    way:Layer("water", true)
    way:Attribute("kind", natural == "coastline" and "ocean" or "lake")
    way:MinZoom(4)
    return
  end

  -- Landuse
  if landuse ~= "" then
    local lu_kind = nil
    if     landuse == "forest" or landuse == "wood"                 then lu_kind = "forest"
    elseif landuse == "residential"                                 then lu_kind = "residential"
    elseif landuse == "commercial" or landuse == "retail"           then lu_kind = "commercial"
    elseif landuse == "industrial"                                  then lu_kind = "industrial"
    elseif landuse == "farmland" or landuse == "farmyard"           then lu_kind = "farmland"
    elseif landuse == "park" or landuse == "recreation_ground"      then lu_kind = "park"
    end
    if lu_kind then
      way:Layer("landuse", true)
      way:Attribute("kind", lu_kind)
      way:MinZoom(10)
    end
    return
  end

  -- Green / natural areas
  if natural == "wood" or natural == "scrub" or natural == "heath" then
    way:Layer("landuse", true)
    way:Attribute("kind", "forest")
    way:MinZoom(10)
    return
  end

  -- POI ways (amenity=parking, amenity=fuel etc. mapped as area centroids)
  local amenity = way:Find("amenity")
  local poi = poi_amenity[amenity]
  if poi then
    way:LayerAsCentroid("pois")
    way:Attribute("kind", poi.kind)
    local name = way:Find("name")
    if name ~= "" then way:Attribute("name", name) end
    local name_uk = way:Find("name:uk")
    if name_uk ~= "" then way:Attribute("name:uk", name_uk) end
    way:MinZoom(poi.minzoom)
    -- Don't return — building/landuse processing may also apply
  end

  -- Buildings (Protomaps schema name: "buildings")
  if building ~= "" then
    way:Layer("buildings", true)
    way:Attribute("kind", "building")

    -- Height attributes for optional 3D rendering in Protomaps style
    local height = tonumber(way:Find("height"))
    if height then way:AttributeNumeric("height", height) end
    local min_height = tonumber(way:Find("min_height"))
    if min_height then way:AttributeNumeric("min_height", min_height) end

    way:MinZoom(13)

    -- Building address centroids
    local housenumber = way:Find("addr:housenumber")
    if housenumber ~= "" then
      way:LayerAsCentroid("addr")
      way:Attribute("housenumber", housenumber)
      local street = way:Find("addr:street")
      if street ~= "" then way:Attribute("street", street) end
      way:MinZoom(14)
    end
    return
  end

  -- Administrative boundaries (Protomaps schema name: "boundaries")
  if boundary == "administrative" then
    local admin_level = tonumber(way:Find("admin_level")) or 99
    if admin_level <= 8 then
      way:Layer("boundaries", false)
      way:AttributeNumeric("admin_level", admin_level)
      -- Protomaps kind: country (≤2), region (3-4), subregion (5-8)
      local bkind = admin_level <= 2 and "country" or admin_level <= 4 and "region" or "subregion"
      way:Attribute("kind", bkind)
      way:MinZoom(admin_level <= 4 and 5 or admin_level <= 6 and 8 or 10)
    end
    return
  end
end

-- ============================================================================
-- Valid turn restriction types
-- ============================================================================
local valid_restrictions = {
  no_left_turn     = true,
  no_right_turn    = true,
  no_u_turn        = true,
  no_straight_on   = true,
  only_straight_on = true,
  only_right_turn  = true,
  only_left_turn   = true,
}

-- ============================================================================
-- Relation processing (administrative boundaries + turn restrictions)
-- ============================================================================
function relation_scan_function(relation)
  local rtype = relation:Find("type")
  if rtype == "boundary" and relation:Find("boundary") == "administrative" then
    return true
  end
  if rtype == "restriction" then
    return true
  end
  return false
end

function relation_function(relation)
  local rtype = relation:Find("type")

  -- Administrative boundaries (Protomaps schema name: "boundaries")
  if rtype == "boundary" then
    local admin_level = tonumber(relation:Find("admin_level")) or 99
    if admin_level <= 8 then
      relation:Layer("boundaries", false)
      relation:AttributeNumeric("admin_level", admin_level)
      local bkind = admin_level <= 2 and "country" or admin_level <= 4 and "region" or "subregion"
      relation:Attribute("kind", bkind)
      relation:Attribute("name", relation:Find("name"))
      relation:Attribute("name:uk", relation:Find("name:uk"))
      relation:MinZoom(admin_level <= 4 and 5 or admin_level <= 6 and 8 or 10)
    end
    return
  end

  -- Turn restrictions (type=restriction) — app-specific routing layer
  if rtype == "restriction" then
    local restriction = relation:Find("restriction")
    if restriction ~= "" and valid_restrictions[restriction] then
      relation:Layer("restriction", false)
      relation:Attribute("restriction", restriction)
      local except = relation:Find("except")
      if except ~= "" then relation:Attribute("except", except) end
      relation:MinZoom(12)
    end
    return
  end
end
