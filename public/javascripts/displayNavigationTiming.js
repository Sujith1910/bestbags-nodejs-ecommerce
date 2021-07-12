function display_nt(){
    const perfEntries = performance.getEntriesByType("navigation");
    const [p] = perfEntries;
    const pageLoadTime = p.loadEventEnd - p.loadEventStart;
    console.log(pageLoadTime);
}
display_nt()