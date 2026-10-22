# Douyin short-link resolver for Jekyll build.
#
# Authors often paste the share link copied from Douyin, which looks like
#   https://v.douyin.com/qZfAx3ahLwE/
# Such short links cannot be embedded directly (the embed player needs the
# numeric video id). This generator follows the redirect at build time and
# rewrites `douyin_id` to the numeric id, so the <video> layout just works.
#
# If the network request fails, the original value is left untouched and the
# layout falls back to a clickable "在抖音打开" link — the build never breaks.

require 'net/http'
require 'uri'

module DouyinResolve
  UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'

  def self.resolve(short_url)
    uri = URI.parse(short_url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    http.open_timeout = 5
    http.read_timeout = 5

    res = http.get(uri.request_uri, 'User-Agent' => UA)
    loc = res['location']
    if loc && loc.include?('douyin')
      base = "#{uri.scheme}://#{uri.host}"
      loc_uri = URI.parse(loc.start_with?('http') ? loc : "#{base}#{loc}")
      res2 = http.get(loc_uri.request_uri, 'User-Agent' => UA)
      loc = res2['location'] || loc
    end
    # numeric id sits right after /video/ in the resolved URL
    loc.to_s[/video\/(\d+)/, 1]
  rescue StandardError => e
    Jekyll.logger.warn 'DouyinResolve:', "could not resolve #{short_url}: #{e.message}"
    nil
  end
end

class DouyinResolverGenerator < Jekyll::Generator
  priority :low

  def generate(site)
    return unless site.collections.key?('videos')
    site.collections['videos'].docs.each do |doc|
      raw = doc.data['douyin_id']
      next if raw.nil? || raw.to_s.strip.empty?

      raw = raw.to_s.strip
      # only short links / share links need resolving; numeric or /video/ URLs are used as-is
      next unless raw.include?('v.douyin.com') || raw.include?('douyin.com/share')

      id = DouyinResolve.resolve(raw)
      doc.data['douyin_id'] = id if id && !id.empty?
    end
  end
end
