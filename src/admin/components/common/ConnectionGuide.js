/**
 * Connection Guide Component
 * Provides guidance when MetaMask is not connected
 */

import React from 'react';
import MetaMaskConnector from '../network/MetaMaskConnector';

const ConnectionGuide = ({ onConnected, isMobile = false }) => {
    return (
        <div style={{
            backgroundColor: '#fef9e7',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: isMobile ? '1.5rem' : '2rem',
            margin: isMobile ? '1rem 0' : '2rem 0',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦊</div>

            <h3 style={{
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                fontWeight: '600',
                color: '#92400e',
                marginBottom: '1rem'
            }}>
                Connect Your Wallet
            </h3>

            <p style={{
                color: '#78350f',
                fontSize: isMobile ? '0.9rem' : '1rem',
                marginBottom: '1.5rem',
                lineHeight: '1.5'
            }}>
                To access the full admin dashboard features and view live DAO data,
                please connect your MetaMask wallet.
            </p>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1rem'
            }}>
                <MetaMaskConnector onConnected={onConnected} />
            </div>

            <div style={{
                fontSize: isMobile ? '0.8rem' : '0.875rem',
                color: '#a16207',
                backgroundColor: '#fef3c7',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #fcd34d'
            }}>
                <strong>Note:</strong> Make sure you're connected to the correct network (BSC Testnet)
                for the best experience.
            </div>
        </div>
    );
};

export default ConnectionGuide;