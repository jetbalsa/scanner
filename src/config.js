const config = {
    interface: 'wlan0',
    blacklistUrls: [
        'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/ultimate.txt',
        'https://v.firebog.net/hosts/Easylist.txt',
        'https://v.firebog.net/hosts/Admiral.txt',
        'https://v.firebog.net/hosts/Easyprivacy.txt',
        'https://v.firebog.net/hosts/Prigent-Ads.txt',
        'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml&showintro=0&mimetype=plaintext',
        'https://raw.githubusercontent.com/RooneyMcNibNug/pihole-stuff/master/SNAFU.txt',
        'https://big.oisd.nl/domainswild2'
    ],
    port: 3000
};

export default config;
