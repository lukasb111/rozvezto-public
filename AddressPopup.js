import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import styles from "../../styles/nabidka/Popup.module.css";
import * as deliveryActions from "../../client/store/actions/delivery";
import * as guideActions from "../../client/store/actions/guide";
import PopupGPS from "../global/gps/PopupGPS";
import { useRouter } from "next/router";
import Preloader from "../global/preloaders/Preloader";
import ls from "local-storage";
import loadMapycz from "../../utils/loadMapycz";
import loadGoogleMaps from "../../utils/loadGoogleMaps";

const AddressPopup = () => {
  const dispatch = useDispatch();
  const delivery = useSelector((state) => state.delivery);
  const guide = useSelector((state) => state.guide);
  const [hideButton, setHideButton] = useState(false);
  const [ready, setReady] = useState(false);
  const [globalMap, setGlobalMap] = useState(null);
  const { address, popupOpen } = delivery;
  const router = useRouter();
  const guideVideoUrl =
    window.innerWidth < 600
      ? "https://www.youtube.com/embed/xCxUjD-vGcU?hl=cs"
      : "https://www.youtube.com/embed/IAL4Hhy3Bbw?hl=cs";

  let map;
  let center;
  let finishText = "Vyhledat restaurace";

  const { business_type, business_name } = router.query;

  if (router.pathname.includes("/nabidka/[restaurace]")) {
    finishText = "Potvrdit";
  }

  const changeState = () => {
    dispatch(deliveryActions.changePopupState(false));
  };

  const finish = () => {
    function close() {
      console.log(business_name);
      console.log(business_type);
      if (!business_type) router.push("./restaurace");

      if (business_type && business_name) {
        console.log("pass");
      }
    }

    ls.set("userLocationMapOpen", false);
    dispatch(
      deliveryActions.finishMapSelection(
        "Doručit",
        address,
        delivery.gps,
        false
      )
    ).then(() => close());
  };

  const LoadMap = () => {
    function initMap() {
      if (delivery.gps.lat !== "" && delivery.gps.long !== "") {
        center = {
          lat: delivery.gps.lat,
          lng: delivery.gps.long,
        };
      } else {
        center = {
          lat: 49.742358,
          lng: 13.595715,
        };
      }

      map = new google.maps.Map(document.getElementById("m"), {
        center: center,
        zoom: 18,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });

      map.addListener("dragstart", () => {
        setHideButton(true);
      });

      map.addListener("dragend", () => {
        setHideButton(false);

        const newMapCenter = map.getCenter();
        const latitude = newMapCenter.lat();
        const longitude = newMapCenter.lng();

        const coords = new SMap.Coords(longitude, latitude);
        new SMap.Geocoder.Reverse(coords, odpoved);

        function odpoved(geocoder) {
          const results = geocoder.getResults();

          let isAddress = false;
          let muni = null;
          if (results.items[0].type === "addr") {
            isAddress = true;
          }

          results.items.forEach((result) => {
            if (result.type === "muni") {
              muni = result.name;
            }
          });

          dispatch(
            deliveryActions.changeGPS(
              results.label,
              {
                lat: latitude,
                long: longitude,
              },
              isAddress,
              muni
            )
          );
        }
      });
      setGlobalMap(map);
    }

    initMap();
  };

  useEffect(() => {
    loadMapycz(() => {
      loadGoogleMaps(() => {
        setReady(true);
      });
    });
  }, []);

  useEffect(() => {
    if (ready && guide.mapGuided && ls.get("userLocationMapOpen")) {
      LoadMap();
    }
  }, [ready, guide.mapGuided, ls.get("userLocationMapOpen")]);

  useEffect(() => {
    if (ready && ls.get("userLocationMapOpen") && globalMap !== null) {
      globalMap.setCenter(
        new google.maps.LatLng(delivery.gps.lat, delivery.gps.long)
      );
    }
  }, [delivery.map]);

  if (!ls.get("userLocationMapOpen")) {
    return null;
  }

  if (!guide.mapGuided) {
    return (
      <div className={`${styles.overlay} ${popupOpen && styles.open}`}>
        <div className={styles.inner}>
          <div className={styles.closeButton}>
            <span onClick={() => dispatch(guideActions.mapGuide(true))}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={styles.cross}
              >
                <path d="M9.996 11.5L4.75 6.25l1.5-1.5L11.5 10h1.002l5.248-5.25 1.5 1.5L14 11.5v1l5.25 5.25-1.5 1.5L12.5 14l-1 .002-5.25 5.248-1.5-1.5L10 12.5z" />
              </svg>
            </span>
          </div>
          <div className={`${styles.body} `}>
            <div className={styles.guideTop}>
              <div>
                <div className={styles.guideHeader}>
                  Věnujte nám chvíli pozornost
                </div>
                <div className={styles.guideText}>
                  <span>Proč?</span>
                  Abychom Vám mohli správně určit cenu dopravy, ukázat pouze
                  restaurace ze kterých k Vám dovážíme a kurýra správně
                  navigovat až k Vámi vybranému místu doručení potřebujeme vědět
                  kam přesně si chcete objednat.
                  <span>Jak nám můžete usnadnit doručení?</span>
                  Stačí když správně vyberete místo kam chcete objednávku
                  doručit, připravili jsme pro Vás video jak na to!
                </div>
              </div>
              <div>
                <iframe
                  className={styles.video}
                  frameBorder="0"
                  src={guideVideoUrl}
                  allowFullScreen="allowfullscreen"
                />
              </div>
            </div>

            <div className={styles.guideBottom}>
              <button onClick={() => dispatch(guideActions.mapGuide(true))}>
                Rozumím
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ready && guide.mapGuided) {
    return (
      <div className={`${styles.overlay} ${popupOpen && styles.open}`}>
        <div className={styles.inner}>
          <Preloader />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.overlay} ${popupOpen && styles.open}`}>
      <div className={styles.inner}>
        <div className={styles.closeButton}>
          <span onClick={changeState}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={styles.cross}
            >
              <path d="M9.996 11.5L4.75 6.25l1.5-1.5L11.5 10h1.002l5.248-5.25 1.5 1.5L14 11.5v1l5.25 5.25-1.5 1.5L12.5 14l-1 .002-5.25 5.248-1.5-1.5L10 12.5z" />
            </svg>
          </span>
        </div>

        <div className={`${styles.body} `}>
          <div className={styles.desktopText}>
            <p className={styles.mainText}>
              Zadejte vaši ulici a číslo popisné
            </p>
          </div>

          <div className={styles.wrap}>
            <div id="popupGPSHolder" className={styles.input}>
              <PopupGPS />
            </div>
          </div>

          <div className={styles.mapContainer}>
            <div id="m" className={styles.map}></div>
            <div className={styles.pin}></div>

            <div
              onClick={() => dispatch(guideActions.mapGuide(false))}
              className={styles.triangle}
            />
            <div
              onClick={() => dispatch(guideActions.mapGuide(false))}
              className={styles.mark}
            >
              ?
            </div>

            {hideButton ? null : (
              <div className={styles.buttonWrap}>
                <button
                  onClick={finish}
                  disabled={!address}
                  className={styles.button}
                >
                  {finishText}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressPopup;
