import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Calendar, Building2, Users2, ArrowRight, Search, FilterX, Inbox } from "lucide-react";
import { api } from "../../api/client";
import { PageHeader, EmptyState, Skeleton } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useSection } from "../../context/SectionContext";
export default function ExamsList() {
    const { sectionId } = useSection();
    const [exams, setExams] = useState([]);
    const [commissions, setCommissions] = useState([]);
    const [filter, setFilter] = useState({ commissionNo: "", from: "", to: "" });
    const [loading, setLoading] = useState(true);
    // Lookup commissions filtered by section
    useEffect(() => {
        const params = {};
        if (sectionId !== null)
            params.sectionId = sectionId;
        api
            .get("/lookup/commissions", { params })
            .then((r) => setCommissions(r.data));
        // selecting a section may invalidate previous commissionNo
        setFilter((f) => ({ ...f, commissionNo: "" }));
    }, [sectionId]);
    useEffect(() => {
        setLoading(true);
        const params = {};
        if (filter.commissionNo)
            params.commissionNo = filter.commissionNo;
        if (filter.from)
            params.from = filter.from;
        if (filter.to)
            params.to = filter.to;
        if (sectionId !== null)
            params.sectionId = sectionId;
        api
            .get("/exams", { params })
            .then((r) => setExams(r.data))
            .finally(() => setLoading(false));
    }, [filter, sectionId]);
    const hasFilters = !!(filter.commissionNo || filter.from || filter.to);
    return (_jsxs("div", { children: [_jsx(PageHeader, { title: "\u0130mtahanlar", description: "B\u00FCt\u00FCn imtahan komissiyalar\u0131n\u0131 v\u0259 tarixl\u0259rini idar\u0259 edin", icon: _jsx(GraduationCap, { className: "w-6 h-6" }) }), _jsxs("div", { className: "card p-4 mb-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400" }), _jsx("span", { className: "text-sm font-semibold text-slate-700", children: "Filtr" }), hasFilters && (_jsxs("button", { onClick: () => setFilter({ commissionNo: "", from: "", to: "" }), className: "ml-auto text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1", children: [_jsx(FilterX, { className: "w-3.5 h-3.5" }), "T\u0259mizl\u0259"] }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Komissiya" }), _jsxs("select", { className: "input", value: filter.commissionNo, onChange: (e) => setFilter({ ...filter, commissionNo: e.target.value }), children: [_jsx("option", { value: "", children: "B\u00FCt\u00FCn komissiyalar" }), commissions.map((c) => (_jsxs("option", { value: c.commissionNo, children: [c.commissionNo, " \u2014 ", c.name] }, c.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Ba\u015Flan\u011F\u0131c" }), _jsx("input", { type: "date", className: "input", value: filter.from, onChange: (e) => setFilter({ ...filter, from: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Son tarix" }), _jsx("input", { type: "date", className: "input", value: filter.to, onChange: (e) => setFilter({ ...filter, to: e.target.value }) })] })] })] }), loading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", children: [1, 2, 3, 4, 5, 6].map((i) => (_jsxs("div", { className: "card p-5 space-y-3", children: [_jsx(Skeleton, { className: "h-4 w-24" }), _jsx(Skeleton, { className: "h-6 w-3/4" }), _jsx(Skeleton, { className: "h-4 w-1/2" }), _jsx(Skeleton, { className: "h-8 w-full" })] }, i))) })) : exams.length === 0 ? (_jsx("div", { className: "card", children: _jsx(EmptyState, { icon: _jsx(Inbox, { className: "w-7 h-7" }), title: "\u0130mtahan tap\u0131lmad\u0131", description: sectionId !== null
                        ? "Seçdiyiniz bölmə və filtrlərə uyğun imtahan yoxdur."
                        : "Seçdiyiniz filtrlərə uyğun imtahan yoxdur." }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", children: exams.map((e) => (_jsxs(Link, { to: `/exams/${e.id}`, className: "card card-hover p-5 group block", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500", children: [_jsx(Calendar, { className: "w-3.5 h-3.5" }), formatDate(e.examDate)] }), _jsx(ArrowRight, { className: "w-4 h-4 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" })] }), _jsx("h3", { className: "font-semibold text-slate-900 leading-snug mb-3 line-clamp-2", children: e.name }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-600", children: [_jsx(Building2, { className: "w-4 h-4 text-slate-400 shrink-0" }), _jsx("span", { className: "truncate", children: e.buildingName ?? "—" })] }), _jsxs("div", { className: "flex items-center gap-2 text-slate-600", children: [_jsx(Users2, { className: "w-4 h-4 text-slate-400 shrink-0" }), _jsxs("span", { children: [e.studentCount ?? "—", " t\u0259l\u0259b\u0259"] })] }), e.sectionName && (_jsx("div", { className: "flex items-center gap-2 text-slate-600", children: _jsx("span", { className: "badge-neutral !py-0.5", children: e.sectionName }) }))] }), e.commissionNos.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100", children: e.commissionNos.map((c) => (_jsx("span", { className: "badge-brand", children: c }, c))) }))] }, e.id))) }))] }));
}
