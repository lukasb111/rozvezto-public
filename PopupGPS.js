import React, { useEffect, useState } from "react";
import styles from "../../../styles/landing/Address.module.css";
import { useSelector, useDispatch } from "react-redux";
import * as deliveryActions from "../../../client/store/actions/delivery";
import uniqueId from "../../../utils/newId";
import ls from "local-storage";
import loadMapycz from "../../../utils/loadMapycz";

const PopupGPS = () => {
  const delivery = useSelector((state) => state.delivery);
  const [value, setValue] = useState(delivery.address || "");
  const [load, setLoad] = useState(false);
  const [suggestLoaded, setSuggestLoaded] = useState(false);
  const dispatch = useDispatch();
  const [id] = useState(uniqueId("popupGPS-"));

  function initAutosuggest() {
    class MyItem extends SMap.SuggestItem {
      _create() {
        let node = document.createElement("li");
        node.classList.add("item");

        console.log(!this._data.clickable);
        if (!this._data.clickable) {
          node.classList.add("not_clickable");
        }

        let titlePart = document.createElement("span");
        titlePart.classList.add("text");

        let title = document.createElement("span");
        title.classList.add("first_part");
        title.innerHTML = this._data.title;

        titlePart.appendChild(title);

        let title2 = document.createElement("span");
        title2.classList.add("second_part");
        title2.innerHTML = " " + this._data.secondRow;

        titlePart.appendChild(title2);

        this._addRow(titlePart, this._data.thirdRow);

        this._dom.node = node;

        node.appendChild(titlePart);
      }
    }
    class MyProvider extends SMap.SuggestProvider {
      _processData() {
        if (!this._responseData) return;

        let rawData = JSON.parse(this._responseData.data);
        let filteredData = rawData;
        let filteredArray = [];

        console.log(rawData);

        if (rawData.result && Array.isArray(rawData.result)) {
          rawData.result.forEach((item) => {
            if ("userData" in item) {
              if (item.userData.region === "Plzeňský kraj") {
                filteredArray.push(item);
              }
            } else if ("origData" in item) {
              if (item.origData.region === "Plzeňský kraj") {
                filteredArray.push(item);
              }
            }
          });
        } else {
          console.error("YIKES");
        }

        filteredData.result = filteredArray;

        function hasNumber(myString) {
          return /\d/.test(myString);
        }

        if (filteredData.result.length === 0) {
          const phrase = suggest.getPhrase();
          if (hasNumber(phrase) && phrase.length > 4) {
            const resultsItems = [
              {
                clickable: false,
                title: "",
                secondRow: "Dále zadejte obec",
              },
            ];

            this._promise.fulfill(resultsItems);
          }

          console.log("none found");
          const resultsItems = [
            {
              clickable: false,
              title: "",
              secondRow: "Zadejte ulici, číslo popisné a obec",
            },
          ];

          this._promise.fulfill(resultsItems);
        }

        if (rawData.result && Array.isArray(rawData.result)) {
          let resultsItems = rawData.result.map((item) => {
            const { municipality, region } = item.userData;

            let poiTypeId = item.userData.poiTypeId || 0;
            let firstRow = item.userData.suggestFirstRow.trim();
            let secondRow = (item.userData.suggestSecondRow || "").trim();
            let id = item.userData.id;

            if (item.userData.source === "coor" && typeof id === "number") {
              id = item.userData.longitude + "," + item.userData.latitude;
            }

            if (item.category === "address_cz") {
              secondRow = municipality + ", " + region;
            }

            return {
              longitude: parseFloat(item.userData.longitude),
              latitude: parseFloat(item.userData.latitude),
              source: item.userData.source,
              id: id,
              title: firstRow,
              secondRow: secondRow,
              thirdRow: (item.userData.suggestThirdRow || "").trim(),
              phrase: firstRow,
              poiTypeId: poiTypeId,
              origData: item.userData, // pridame si informaci o vsech datech
              clickable: true,
            };
          });

          ls.set("firstSuggestion", resultsItems[0]);
          this._promise.fulfill(resultsItems);
        }

        this._promise = null;
        this._request = null;
      }
    }

    ls.set("suggestionConcurrency", false);
    var inputEl = document.getElementById(id);
    var suggest = new SMap.Suggest(inputEl, {
      factory: (data, pos) => new MyItem(data, pos),
      provider: new MyProvider(),
    });
    suggest.urlParams({
      limit: 5,
      count: 5,
      type: "municipality|street|address",
      bounds: "48.5370786,12.0921668|51.0746358,18.8927040",
      locality: "Rokycany|cz",
      langFilter: "native,cs",
    });

    inputEl.addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        if (!ls.get("suggestionConcurrency")) {
          const autofill = ls.get("firstSuggestion");

          const address = autofill.title + " " + autofill.secondRow;
          const isAddress = autofill.origData.hasAddress;
          const muni = autofill.origData.municipality;

          dispatch(deliveryActions.changeMapFin(isAddress, muni));

          dispatch(
            deliveryActions.changeMap(address, {
              lat: autofill.latitude,
              long: autofill.longitude,
            })
          );
        } else {
          ls.set("suggestionConcurrency", false);
        }
      }
    });

    suggest
      .addListener("suggest", function (suggestData) {
        // vyber polozky z naseptavace
        // console.log(suggestData);
        const address =
          suggestData.data.title + " " + suggestData.data.secondRow;

        const isAddress = suggestData.data.origData.hasAddress;
        const muni = suggestData.data.origData.municipality;

        console.log("IS address: " + isAddress);

        dispatch(deliveryActions.changeMapFin(isAddress, muni));

        dispatch(
          deliveryActions.changeMap(address, {
            lat: suggestData.data.latitude,
            long: suggestData.data.longitude,
          })
        );
      })
      .addListener("close", function () {});

    setSuggestLoaded(true);
  }

  useEffect(() => {
    loadMapycz(() => {
      console.log("loaded");
    });
  }, []);

  useEffect(() => {
    setValue(delivery.address);
    if (!load) {
      setLoad(true);
    }
  }, [delivery.gps]);

  const handleChange = (event) => {
    if (!suggestLoaded) initAutosuggest();
    const inputEl = event.target.value;
    setValue(inputEl);
  };

  return (
    <input
      id={id}
      type="text"
      onChange={handleChange}
      value={value}
      className={styles.input}
      placeholder="Ulice a číslo popisné"
      autoComplete="off"
    />
  );
};

export default PopupGPS;
