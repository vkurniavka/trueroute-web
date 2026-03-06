-- process.lua — TrueRoute navigation tile schema
-- Extracts roads, places, water, boundaries, and buildings for navigation use.

-- ============================================================================
-- Tag keys that trigger processing (tilemaker uses these to filter input)
-- ============================================================================

node_keys    = { "place", "natural", "amenity" }
way_keys     = { "highway", "waterway", "natural", "landuse", "building", "boundary", "railway" }
relation_keys= { "boundary", "type" }

-- ============================================================================
-- Highway class mapping (OSM highway tag → navigation class)
-- ============================================================================
local highway_class = {
  motorway        = "motorway",
  motorway_link   = "motorway",
  trunk           = "trunk",
  trunk_link      = "trunk",
  primary         = "primary",
  primary_link    = "primary",
  secondary       = "secondary",
  secondary_link  = "secondary",
  tertiary        = "tertiary",
  tertiary_link   = "tertiary",
  unclassified    = "minor",
  residential     = "minor",
  living_street   = "minor",
  service         = "service",
  track           = "track",
  path            = "path",
  cycleway        = "path",
  footway         = "path",
  pedestrian      = "path",
  steps           = "path",
  ferry           = "ferry",
}

-- ============================================================================
-- Place rank (lower = more important = shown at lower zooms)
-- ============================================================================
local place_rank = {
  city         = 1,
  town         = 2,
  village      = 3,
  hamlet       = 4,
  suburb       = 5,
  neighbourhood = 6,
  locality     = 7,
  isolated_dwelling = 8,
}

-- ============================================================================
-- Node processing
-- ============================================================================
function node_function(node)
  local place = node:Find("place")
  if place ~= "" then
    local rank = place_rank[place]
    if rank then
      node:Layer("place", false)
      node:Attribute("class", place)
      node:Attribute("name", node:Find("name"))
      node:Attribute("name:uk", node:Find("name:uk"))
      node:Attribute("name:en", node:Find("name:en"))
      node:AttributeNumeric("rank", rank)
      node:MinZoom(math.max(4, rank + 3))
    end
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
    local class = highway_class[highway]
    if not class then return end

    -- Transportation layer (geometry)
    way:Layer("transportation", false)
    way:Attribute("class", class)
    way:Attribute("oneway", way:Find("oneway"))
    way:Attribute("maxspeed", way:Find("maxspeed"))
    way:Attribute("surface", way:Find("surface"))
    way:Attribute("access", way:Find("access"))

    -- Min zoom by road class
    local minz = 14
    if class == "motorway" or class == "trunk" then minz = 7
    elseif class == "primary" then minz = 9
    elseif class == "secondary" then minz = 10
    elseif class == "tertiary" then minz = 11
    elseif class == "minor" then minz = 12
    end
    way:MinZoom(minz)

    -- Transportation name layer
    local name = way:Find("name")
    if name ~= "" and minz <= 12 then
      way:Layer("transportation_name", false)
      way:Attribute("class", class)
      way:Attribute("name", name)
      way:Attribute("name:uk", way:Find("name:uk"))
      way:MinZoom(math.max(minz, 10))
    end
    return
  end

  -- Railways (for context)
  if railway == "rail" or railway == "light_rail" or railway == "subway" or railway == "tram" then
    way:Layer("transportation", false)
    way:Attribute("class", "rail")
    way:Attribute("subclass", railway)
    way:MinZoom(10)
    return
  end

  -- Waterways
  if waterway ~= "" then
    if waterway == "river" or waterway == "canal" or waterway == "stream" then
      way:Layer("waterway", true)
      way:Attribute("class", waterway)
      way:Attribute("name", way:Find("name"))
      way:MinZoom(waterway == "river" and 9 or 12)
    end
    return
  end

  -- Water bodies
  if natural == "water" or natural == "bay" or natural == "coastline" then
    way:Layer("water", true)
    way:Attribute("class", natural == "coastline" and "ocean" or "lake")
    way:MinZoom(4)
    return
  end

  -- Landuse
  if landuse ~= "" then
    local lu_class = nil
    if landuse == "forest" or landuse == "wood" then lu_class = "forest"
    elseif landuse == "residential" then lu_class = "residential"
    elseif landuse == "commercial" or landuse == "retail" then lu_class = "commercial"
    elseif landuse == "industrial" then lu_class = "industrial"
    elseif landuse == "farmland" or landuse == "farmyard" then lu_class = "farmland"
    elseif landuse == "park" or landuse == "recreation_ground" then lu_class = "park"
    end
    if lu_class then
      way:Layer("landuse", true)
      way:Attribute("class", lu_class)
      way:MinZoom(10)
    end
    return
  end

  -- Green areas (natural)
  if natural == "wood" or natural == "scrub" or natural == "heath" then
    way:Layer("landuse", true)
    way:Attribute("class", "forest")
    way:MinZoom(10)
    return
  end

  -- Buildings
  if building ~= "" then
    way:Layer("building", true)
    way:MinZoom(13)
    return
  end

  -- Administrative boundaries
  if boundary == "administrative" then
    local admin_level = tonumber(way:Find("admin_level")) or 99
    if admin_level <= 8 then
      way:Layer("boundary", false)
      way:AttributeNumeric("admin_level", admin_level)
      way:MinZoom(admin_level <= 4 and 5 or admin_level <= 6 and 8 or 10)
    end
    return
  end
end

-- ============================================================================
-- Relation processing (administrative boundaries only)
-- ============================================================================
function relation_scan_function(relation)
  if relation:Find("type") == "boundary" and relation:Find("boundary") == "administrative" then
    return true
  end
  return false
end

function relation_function(relation)
  local admin_level = tonumber(relation:Find("admin_level")) or 99
  if admin_level <= 8 then
    relation:Layer("boundary", false)
    relation:AttributeNumeric("admin_level", admin_level)
    relation:Attribute("name", relation:Find("name"))
    relation:Attribute("name:uk", relation:Find("name:uk"))
    relation:MinZoom(admin_level <= 4 and 5 or admin_level <= 6 and 8 or 10)
  end
end
