import React, { useState, useEffect } from "react";
import logo from "../../assets/logo.png";
import { Principal }  from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { opend } from "../../../declarations/opend";
import Button from "./Button";
import PriceLabel from "./PriceLabel";
import CURRENT_USER_ID from "../index";
import { canisterId } from "../../../declarations/nft/index";

function Item(props) {

  const [ name, setName ] = useState();
  const [ owner, setOwner ] = useState();
  const [ image, setImage ] = useState();
  const [ button, setButton ] = useState();
  const [ priceInput, setPriceInput ] = useState();
  const [ loaderHidden, setLoaderHidden ] = useState(true);
  const [ blur, setBlur ] = useState();
  const [ sellStatus, setSellStatus ] = useState("");
  const [ priceLabel, setPriceLabel ] = useState();

  const id = props.id;
  const localHost = "http://localhost:8080";
  const agent = new HttpAgent({host: localHost});
  //TODO: When deploy live, to remove the following line.
  agent.fetchRootKey();

  let NFTActor;
  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id
    });

    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);


    const image = URL.createObjectURL(
      new Blob([imageContent.buffer], { type: "image/png" })
    );
    
    setName(name);
    setOwner(owner.toString());
    setImage(image);
    // console.log("name is ", name);
    // console.log("owner is ", owner);

    if (props.role == "collection") {
        const nftIsListed = await opend.isListed(id);
        if (nftIsListed) {
          setSellStatus("Listed");
          setOwner("OpenD");
          setBlur({ filter:"blur(4px)"});
        } else {
          setButton(<Button handleClick={handleSell} text="Sell"/>);
        }
    } else if (props.role == "discover") {
      let originalOwner = await opend.getOriginalOwner(props.id);
      if(originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text="Buy"/>);
      };
      const NFTPrice = await opend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel price={NFTPrice.toString()}/>);
    };
  };

  useEffect(() => {
    loadNFT()
  },[]);

  let price;
  function handleSell() {
    console.log("Sell was clicked");
    setPriceInput(
      <input
        placeholder="Price in LSGE"
        type="number"
        className="price-input"
        value={price}
        onChange={(e) => (price=e.target.value)}
      />
    );
    setButton(<Button handleClick={sellItem} text="Confirm"/>)
  };

  async function sellItem() {
    setLoaderHidden(false);
    setBlur({ filter:"blur(4px)"});
    const listingResults = await opend.listItem(props.id, Number(price));
    console.log("listing is " + listingResults);
    const openDId = await opend.getOpenDCanisterID();
    const transferResult = await NFTActor.transferOwnership(openDId);
    console.log("transfer result is: " + transferResult);
    if(transferResult == "Success") {
      setLoaderHidden(true);
      setButton();
      setPriceInput();
      setOwner("OpenD");
      setSellStatus("Listed");
    }
  }

  async function handleBuy () {
    console.log("Buy was clicked");
    const tokenActor = await Actor.createActor(tokenIdlFactory,{
      agent,
      canisterId: Principal.fromText("qoctq-giaaa-aaaaa-aaaea-cai"),
    });

    const sellerId = await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    console.log("Buy result is: " + result);
    if (result == "Success") {
     const transferResult = await opend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
     console.log("Purchase is: "+ transferResult);
    };
  };

  return (
    <div className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
