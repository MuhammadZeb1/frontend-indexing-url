import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ✅ Toastify Imports
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ Zod Import
import { z } from "zod";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://backend-url-indexing.vercel.app" // production URL
    : "http://localhost:5000";                  // local development


// URL validation schema
const urlSchema = z.string().url();

function CampaignTool() {
    const [token, setToken] = useState(localStorage.getItem('campaignToken') || '');
    const [credits, setCredits] = useState('...');
    const [campaigns, setCampaigns] = useState([]);
    const [campaignName, setCampaignName] = useState('');
    const [urlsText, setUrlsText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [invalidUrls, setInvalidUrls] = useState([]);

    const currentUrlCount = urlsText
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0)
        .length;

    // Fetch data from API
    const fetchData = async () => {
        if (!token) {
            setCredits('Not initialized');
            return;
        }

        try {
            const creditRes = await axios.get(`${BASE_URL}/api/credits?token=${token}`);
            setCredits(creditRes.data.remainingCredits);

            const campaignRes = await axios.get(`${BASE_URL}/api/campaigns?token=${token}`);
            setCampaigns(campaignRes.data.campaigns || []);
            setError('');
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Could not connect to service or token invalid.');
            toast.error("❌ Could not connect to service.");
        }
    };

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000);
        return () => clearInterval(intervalId);
    }, [token]);

    // Real-time URL validation
    useEffect(() => {
        const urls = urlsText
            .split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);

        const invalid = urls.filter(url => {
            try {
                urlSchema.parse(url);
                return false; // valid
            } catch {
                return true; // invalid
            }
        });

        setInvalidUrls(invalid);
    }, [urlsText]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const urls = urlsText
            .split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);

        // Check invalid URLs before submit
        if (invalidUrls.length > 0) {
            setError("Please fix invalid URLs before submitting.");
            toast.error("❌ Please fix invalid URLs before submitting.");
            setLoading(false);
            return;
        }

        if (urls.length === 0 || urls.length > 200) {
            setError("Please submit between 1 and 200 URLs.");
            toast.error("⚠ Please submit 1–200 URLs.");
            setLoading(false);
            return;
        }

        try {
            const res = await axios.post(`${BASE_URL}/api/submit`, { 
                campaignName, 
                urls, 
                clientToken: token 
            });

            // New Token
            if (res.data.newCampaignToken && res.data.newCampaignToken !== token) {
                localStorage.setItem('campaignToken', res.data.newCampaignToken);
                setToken(res.data.newCampaignToken);
            }

            setCampaignName('');
            setUrlsText('');
            setCredits(res.data.remainingCredits);
            fetchData();

            toast.success("✅ Campaign submitted successfully!");
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Network error or server unavailable.';
            setError(errorMessage);
            toast.error(`❌ ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans">

            {/* Title */}
            <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
                🔗 URL Indexing Campaign Tool
            </h1>

            {/* Credits Box */}
            <div className={`p-5 rounded-lg text-center text-xl font-semibold shadow-md border 
                ${Number(credits) < 100 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
                Current Credits: {credits}
            </div>

            {/* Error UI */}
            {error && (
                <div className="bg-red-500 text-white text-lg p-4 rounded-md shadow-md">
                    🚨 {error}
                </div>
            )}

            {/* Submit Campaign Card */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
                <h2 className="text-3xl font-semibold mb-6 text-green-600">Submit New Campaign</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block mb-2 font-medium text-green-700 text-lg">Campaign Name:</label>
                        <input 
                            type="text" 
                            value={campaignName} 
                            onChange={(e) => setCampaignName(e.target.value)} 
                            required 
                            placeholder="Name your campaign"
                            className="text-green-900 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium text-green-700 text-lg">URLs (One per line, Max 200):</label>
                        <textarea
                            value={urlsText}
                            onChange={(e) => setUrlsText(e.target.value)}
                            required
                            placeholder="https://example.com/page-1&#10;https://example2.net/post-a"
                            className="text-green-900 w-full p-3 border border-gray-300 rounded-lg h-48 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        ></textarea>

                        {invalidUrls.length > 0 && (
                            <div className="mt-2 text-red-600 font-medium">
                                ❌ Invalid URLs:
                                <ul className="list-disc ml-5">
                                    {invalidUrls.map((url, idx) => (
                                        <li key={idx}>{url}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg text-white font-semibold text-lg transition 
                        ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}
                    >
                        {loading ? 'Submitting...' : `Submit Campaign (${currentUrlCount} credits)`}
                    </button>
                </form>
            </div>

            {/* Campaign History */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
                <h2 className="text-3xl font-semibold mb-6 text-gray-800">Campaign History & Progress</h2>

                <div className={`${campaigns.length > 5 ? 'max-h-96 overflow-y-scroll' : ''} overflow-x-auto rounded-lg border border-gray-200`}>
                    <table className="min-w-full table-auto border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr className="text-left text-gray-700">
                                <th className="border px-4 py-3 font-semibold">Name</th>
                                <th className="border px-4 py-3 font-semibold">Total</th>
                                <th className="border px-4 py-3 font-semibold">Status</th>
                                <th className="border px-4 py-3 font-semibold">Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-6 text-gray-600">No campaigns found. Submit one above!</td>
                                </tr>
                            ) : (
                                campaigns.map(campaign => {
                                    const total = campaign.totalUrls || 0;
                                    const indexed = campaign.indexedCount || 0;
                                    const progressPercent = total > 0 ? Math.round((indexed / total) * 100) : 0;

                                    let statusColor = 'text-orange-500';
                                    if (campaign.status === 'Complete') statusColor = 'text-green-600';
                                    if (campaign.status === 'Failed') statusColor = 'text-red-600';

                                    return (
                                        <tr key={campaign._id} className="hover:bg-gray-50 transition">
                                            <td className="border px-4 py-3 text-black">{campaign.name || 'Unnamed'}</td>
                                            <td className="border px-4 py-3 text-black">{total}</td>
                                            <td className={`border px-4 py-3 font-bold ${statusColor}`}>{campaign.status || 'Pending'}</td>
                                            <td className="border px-4 py-3 text-black">
                                                {indexed}/{total} ({progressPercent}%)
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Toast Container */}
            <ToastContainer position="top-right" autoClose={2500} />
        </div>
    );
}

export default CampaignTool;
