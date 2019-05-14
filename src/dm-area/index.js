import React, { useState, useEffect, useMemo } from "react";
import createPersistedState from "use-persisted-state";
import { DmMap } from "./dm-map";
import { SelectMapModal } from "./select-map-modal";

const useLoadedMapId = createPersistedState("loadedMapId");

export const DmArea = () => {
  const [data, setData] = useState(null);
  const [loadedMapId, setLoadedMapId] = useLoadedMapId(null);
  const [liveMapId, setLiveMapId] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const loadedMap = useMemo(
    () => (data ? data.maps.find(map => map.id === loadedMapId) || null : null),
    [data, loadedMapId]
  );

  useEffect(() => {
    fetch("/map")
      .then(res => {
        return res.json();
      })
      .then(res => {
        setData(res.data);
        if (
          !res.data.currentMapId &&
          !res.data.maps.find(map => map.id === loadedMapId)
        ) {
          setShowMapModal(true);
        } else {
          setLiveMapId(res.data.currentMapId);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {showMapModal ? (
        <SelectMapModal
          maps={data.maps}
          loadedMapId={loadedMapId}
          liveMapId={liveMapId}
          onClickOutside={() => {
            setShowMapModal(false);
          }}
          setLoadedMapId={loadedMapId => {
            setShowMapModal(false);
            setLoadedMapId(loadedMapId);
          }}
          updateMap={async (mapId, data) => {
            const res = await fetch(`/map/${mapId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(data)
            }).then(res => res.json());

            if (!res.data.map) {
              return;
            }

            setData(data => ({
              ...data,
              maps: data.maps.map(map => {
                if (map.id !== res.data.map.id) {
                  return map;
                } else {
                  return { ...map, ...res.data.map };
                }
              })
            }));
          }}
          deleteMap={async mapId => {
            await fetch(`/map/${mapId}`, {
              method: "DELETE"
            });
            setData(data => ({
              ...data,
              maps: data.maps.filter(map => map.id !== mapId)
            }));
          }}
          createMap={async ({ file, title }) => {
            const formData = new FormData();

            formData.append("file", file);
            formData.append("title", title);

            const res = await fetch(`/map`, {
              method: "POST",
              body: formData
            }).then(res => res.json());
            setData(data => ({
              ...data,
              maps: [...data.maps, res.data.map]
            }));
          }}
        />
      ) : null}
      <div className="navbar navbar-inverse">
        <div className="navbar-header">
          <button
            className="navbar-toggle"
            type="button"
            data-toggle="collapse"
            data-target=".navbar-inverse-collapse"
          >
            <span className="icon-bar" />
            <span className="icon-bar" />
            <span className="icon-bar" />
          </button>
          <a href="/" className="navbar-brand">
            Dungeon Revealer
          </a>
        </div>
        <div
          id="#bs-example-navbar-collapse-2"
          className="collapse navbar-collapse"
        >
          <form className="navbar-form navbar-left" role="search">
            <button
              className="btn btn-default"
              type="button"
              onClick={() => {
                setShowMapModal(true);
              }}
            >
              Load map
            </button>
          </form>
        </div>
      </div>
      {loadedMap ? (
        <DmMap
          loadedMapId={loadedMap.id}
          liveMapId={liveMapId}
          sendLiveMap={async ({ image }) => {
            await fetch(`/map/${loadedMap.id}/send`, {
              method: "POST",
              body: JSON.stringify({
                image
              }),
              headers: {
                "Content-Type": "application/json"
              }
            });
            setLiveMapId(loadedMap.id);
          }}
          hideMap={async () => {
            await fetch("/active-map", {
              method: "POST",
              body: JSON.stringify({
                mapId: null
              }),
              headers: {
                "Content-Type": "application/json"
              }
            });
            setLiveMapId(null);
          }}
        />
      ) : null}
    </>
  );
};