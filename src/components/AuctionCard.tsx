import React, { useRef } from 'react';
import styled, { keyframes } from 'styled-components';

interface AuctionCardProps {
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  onClick?: () => void;
}

const getRandomRotation = () => {
  // Random rotation between -3deg and +3deg
  return (Math.random() * 6 - 3).toFixed(2) + 'deg';
};

const AuctionCard: React.FC<AuctionCardProps> = ({ title, description, price, imageUrl, onClick }) => {
  const rotationRef = useRef(getRandomRotation());
  return (
    <StyledWrapper rotation={rotationRef.current}>
      <div className="card">
        <div className="media-area">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="img" />
          ) : (
            <div className="no-image">
              <span className="no-image-text">No Image</span>
            </div>
          )}
        </div>
        <div className="infoBox">
          <span className="head">{title}</span>
          <span className="price">${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="descBox">
          <p className="description">{description}</p>
        </div>
        <div className="hover-ring" />
      </div>
    </StyledWrapper>
  );
};

const circling = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0,0,0,0.15), 0 0 0 0 rgba(0,0,0,0.10); }
  50% { box-shadow: 0 0 16px 8px rgba(0,0,0,0.18), 0 0 32px 16px rgba(0,0,0,0.10); }
  100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.15), 0 0 0 0 rgba(0,0,0,0.10); }
`;

const StyledWrapper = styled.div<{ rotation: string }>`
  .card {
    width: 320px;
    height: 440px;
    background: rgba(40, 40, 40, 0.82);
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-end;
    color: white;
    transition: 0.2s ease-in-out;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    border: 2.5px solid #18191b;
    box-shadow: 0 4px 24px 0 rgba(30,30,30,0.12);
    margin: 0 auto;
    margin-bottom: 2rem;
    will-change: transform;
  }
  .media-area {
    width: 100%;
    height: 60%;
    min-height: 60%;
    max-height: 60%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #222;
  }
  .img, .no-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    transition: 0.3s filter, 0.2s transform;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .no-image {
    background: #111;
  }
  .no-image-text {
    color: #fff;
    font-size: 1.1em;
    opacity: 0.7;
    letter-spacing: 1px;
  }
  .infoBox {
    width: 100%;
    height: 40%;
    min-height: 40%;
    max-height: 40%;
    background: rgba(24, 25, 27, 0.98);
    padding: 1.1em 1em 0.7em 1em;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
    transition: background 0.2s;
    position: relative;
    justify-content: flex-end;
  }
  .head {
    font-size: 1.25em;
    font-weight: bold;
    margin-bottom: 0.2em;
    color: #fff;
  }
  .price {
    font-size: 1.15em;
    font-weight: bold;
    color: #ffb347;
    margin-bottom: 0;
  }
  .descBox {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    background: rgba(24, 25, 27, 0.98);
    padding: 1.1em 1em 0.7em 1em;
    z-index: 3;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity 0.25s, max-height 0.25s;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
  }
  .description {
    font-size: 1.1em;
    color: #e0e0e0;
    font-weight: 400;
    margin: 0;
  }
  .card:hover .descBox {
    opacity: 1;
    max-height: 180px;
  }
  .card:hover .infoBox {
    background: rgba(24, 25, 27, 0.98);
  }
  .card:hover .img, .card:hover .no-image {
    filter: blur(4px) brightness(0.9);
    transform: rotate(${props => props.rotation});
  }
  .hover-ring {
    pointer-events: none;
    position: absolute;
    top: -8px; left: -8px; right: -8px; bottom: -8px;
    border-radius: 28px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .card:hover .hover-ring {
    opacity: 1;
    animation: ${circling} 1.8s infinite linear;
    box-shadow: 0 0 0 0 #111, 0 0 0 0 #222;
  }
`;

export default AuctionCard; 