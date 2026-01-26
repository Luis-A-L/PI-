import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Child } from '../types';

interface AnalyticsChartsProps {
    childrenData: Child[];
}

const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'];

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ childrenData }) => {

    const genderData = useMemo(() => {
        let m = 0;
        let f = 0;
        childrenData.forEach(c => {
            if (c.sex === 'M') m++;
            else if (c.sex === 'F') f++;
        });
        return [
            { name: 'Masculino', value: m },
            { name: 'Feminino', value: f }
        ].filter(d => d.value > 0);
    }, [childrenData]);

    const ageData = useMemo(() => {
        const groups = { '0-6 Anos': 0, '7-12 Anos': 0, '13-17 Anos': 0, '18+ Anos': 0 };
        const today = new Date();

        childrenData.forEach(c => {
            if (!c.date_of_birth) return;
            const birth = new Date(c.date_of_birth);
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            if (age <= 6) groups['0-6 Anos']++;
            else if (age <= 12) groups['7-12 Anos']++;
            else if (age <= 17) groups['13-17 Anos']++;
            else groups['18+ Anos']++;
        });

        return Object.entries(groups).map(([name, value]) => ({ name, value }));
    }, [childrenData]);

    if (childrenData.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Gender Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <h3 className="text-lg font-bold text-slate-800 mb-4 w-full text-left border-b pb-2">Distribuição por Gênero</h3>
                <div className="w-full h-64 min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={genderData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {genderData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Masculino' ? '#3B82F6' : '#EC4899'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`${value} acolhidos`, 'Quantidade']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Age Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <h3 className="text-lg font-bold text-slate-800 mb-4 w-full text-left border-b pb-2">Faixa Etária</h3>
                <div className="w-full h-64 min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={ageData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip formatter={(value: number) => [`${value} acolhidos`, 'Quantidade']} cursor={{ fill: '#F3F4F6' }} />
                            <Bar dataKey="value" name="Quantidade" fill="#458C57" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsCharts;
