package com.customreporting.entity.service;

import com.customreporting.exception.BusinessRuleException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Instant;
import java.util.Map;

@Service
public class ZohoTokenService {
    private final RestClient restClient = RestClient.create();

    public TokenResult exchange(String accountsDomain, String clientId, String clientSecret, String code) {
        URI base = validateDomain(accountsDomain);
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("code", code);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restClient.post()
                    .uri(base.resolve("/oauth/v2/token"))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (body == null || body.get("access_token") == null) {
                throw new BusinessRuleException("Zoho did not return an access token. Check the generated code and credentials.");
            }
            long expiresIn = body.get("expires_in") instanceof Number number ? number.longValue() : 3600L;
            return new TokenResult(String.valueOf(body.get("access_token")),
                    body.get("refresh_token") == null ? null : String.valueOf(body.get("refresh_token")),
                    Instant.now().plusSeconds(expiresIn));
        } catch (BusinessRuleException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessRuleException("Unable to connect to Zoho. Verify the domain, code and credentials.");
        }
    }

    private URI validateDomain(String domain) {
        try {
            URI uri = URI.create(domain);
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null ||
                    !(host.equals("accounts.zoho.com") || host.startsWith("accounts.zoho."))) {
                throw new BusinessRuleException("Use a valid HTTPS Zoho Accounts domain.");
            }
            return uri;
        } catch (IllegalArgumentException exception) {
            throw new BusinessRuleException("Use a valid HTTPS Zoho Accounts domain.");
        }
    }

    public record TokenResult(String accessToken, String refreshToken, Instant expiresAt) {}
}
